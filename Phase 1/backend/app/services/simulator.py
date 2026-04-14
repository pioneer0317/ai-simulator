from __future__ import annotations

from datetime import datetime, UTC

from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import Base
from app.db.models import EventLogRecord, SessionRecord, StepResponseRecord
from app.schemas.advisors import AdvisorOutput
from app.schemas.sessions import (
    CurrentStepResponse,
    EventLogSummary,
    SessionSummaryResponse,
    StartSessionRequest,
    StartSessionResponse,
    StepResponseSummary,
    StepView,
    SubmitActionRequest,
    SubmitActionResponse,
    SubmitReflectionRequest,
    SubmitReflectionResponse,
)
from app.services.advisors import AdvisorRegistry
from app.services.scenarios import ScenarioEngine, ScenarioLoader


class SimulatorError(Exception):
    """Base simulator error."""


class SessionNotFoundError(SimulatorError):
    """Raised when a session does not exist."""


class UnknownActionError(SimulatorError):
    """Raised when a step action is invalid."""


class SessionAlreadyCompletedError(SimulatorError):
    """Raised when a completed session is accessed like an active one."""


class ReflectionOrderError(SimulatorError):
    """Raised when reflection is submitted before an action."""


class SimulatorService:
    def __init__(
        self,
        *,
        engine: Engine,
        session_factory: sessionmaker[Session],
        scenario_loader: ScenarioLoader,
        scenario_engine: ScenarioEngine,
        advisor_registry: AdvisorRegistry,
        default_scenario_id: str,
    ) -> None:
        """Store the dependencies needed to run the simulator flow."""
        self._engine = engine
        self._session_factory = session_factory
        self._scenario_loader = scenario_loader
        self._scenario_engine = scenario_engine
        self._advisor_registry = advisor_registry
        self._default_scenario_id = default_scenario_id

    def create_tables(self) -> None:
        """Create the phase 1 database tables if they do not exist yet."""
        Base.metadata.create_all(bind=self._engine)

    def start_session(self, request: StartSessionRequest) -> StartSessionResponse:
        """Start a new simulator session at the scenario's first step."""
        scenario_id = request.scenario_id or self._default_scenario_id
        scenario = self._scenario_loader.get(scenario_id)
        first_step = self._scenario_engine.get_first_step(scenario)

        with self._session_factory() as db:
            record = SessionRecord(
                participant_id=request.participant_id,
                scenario_id=scenario.scenario_id,
                current_step_id=first_step.step_id,
                metadata_json=request.metadata,
            )
            db.add(record)
            db.flush()
            self._log_event(
                db,
                session_id=record.session_id,
                step_id=first_step.step_id,
                event_type="session_started",
                payload={
                    "scenario_id": scenario.scenario_id,
                    "participant_id": request.participant_id,
                },
            )
            db.commit()

            return StartSessionResponse(
                session_id=record.session_id,
                scenario_id=record.scenario_id,
                current_step_id=record.current_step_id or first_step.step_id,
                status=record.status,
            )

    def get_current_step(self, session_id: str) -> CurrentStepResponse:
        """Return the session's current step together with its advisor outputs."""
        with self._session_factory() as db:
            session_record = self._get_session(db, session_id)
            if session_record.status == "completed" or session_record.current_step_id is None:
                raise SessionAlreadyCompletedError(
                    f"Session '{session_id}' is already completed."
                )
            scenario = self._scenario_loader.get(session_record.scenario_id)
            step = self._scenario_engine.get_step(scenario, session_record.current_step_id)
            # Create the stored step snapshot the first time the participant reaches this step.
            step_response = self._get_or_create_step_response(db, session_record, step.step_id, step)
            db.commit()

            return CurrentStepResponse(
                session_id=session_record.session_id,
                scenario_id=scenario.scenario_id,
                scenario_title=scenario.title,
                human_role=scenario.human_role,
                session_metadata=session_record.metadata_json,
                step=StepView(
                    step_id=step.step_id,
                    phase=step.phase,
                    title=step.title,
                    context=step.context,
                    reflection_prompt=step.reflection_prompt,
                    possible_actions=step.possible_actions,
                    reflection_enabled=step.reflection_enabled,
                    step_metadata=step.step_metadata,
                ),
                advisor_outputs=[AdvisorOutput.model_validate(output) for output in step_response.advisor_outputs_json],
                chosen_action_id=step_response.chosen_action_id,
                is_completed=session_record.status == "completed",
            )

    def submit_action(self, session_id: str, request: SubmitActionRequest) -> SubmitActionResponse:
        """Store the participant's chosen action and optional rationale for the current step."""
        with self._session_factory() as db:
            session_record = self._get_session(db, session_id)
            if session_record.status == "completed" or session_record.current_step_id is None:
                raise SessionAlreadyCompletedError(
                    f"Session '{session_id}' is already completed."
                )
            scenario = self._scenario_loader.get(session_record.scenario_id)
            step = self._scenario_engine.get_step(scenario, session_record.current_step_id)
            step_response = self._get_or_create_step_response(db, session_record, step.step_id, step)

            valid_action_ids = {action.action_id for action in step.possible_actions}
            if request.action_id not in valid_action_ids:
                raise UnknownActionError(
                    f"Action '{request.action_id}' is not valid for step '{step.step_id}'."
                )

            now = datetime.now(UTC)
            step_response.chosen_action_id = request.action_id
            step_response.rationale = request.rationale
            step_response.decision_metadata_json = request.metadata
            step_response.decision_submitted_at = now

            selected_action = next(action for action in step.possible_actions if action.action_id == request.action_id)
            self._maybe_update_session_metadata(session_record, step.step_id, selected_action)

            self._log_event(
                db,
                session_id=session_record.session_id,
                step_id=step.step_id,
                event_type="action_submitted",
                payload={
                    "action_id": request.action_id,
                    "rationale": request.rationale,
                    **request.metadata,
                },
            )

            if step.reflection_enabled:
                db.commit()
                return SubmitActionResponse(
                    session_id=session_record.session_id,
                    step_id=step.step_id,
                    accepted_action_id=request.action_id,
                    reflection_required=True,
                )

            next_step_id = self._scenario_engine.resolve_next_step(step, request.action_id)
            is_completed = next_step_id is None

            if is_completed:
                session_record.status = "completed"
                session_record.completed_at = now
                session_record.current_step_id = None
                self._log_event(
                    db,
                    session_id=session_record.session_id,
                    step_id=step.step_id,
                    event_type="session_completed",
                    payload={"completed_after_step_id": step.step_id},
                )
            else:
                session_record.current_step_id = next_step_id

            db.commit()

            return SubmitActionResponse(
                session_id=session_record.session_id,
                step_id=step.step_id,
                accepted_action_id=request.action_id,
                reflection_required=False,
                next_step_id=next_step_id,
                is_completed=is_completed,
            )

    def submit_reflection(
        self,
        session_id: str,
        request: SubmitReflectionRequest,
    ) -> SubmitReflectionResponse:
        """Store reflection data, then advance or complete the scenario."""
        with self._session_factory() as db:
            session_record = self._get_session(db, session_id)
            if session_record.status == "completed" or session_record.current_step_id is None:
                raise SessionAlreadyCompletedError(
                    f"Session '{session_id}' is already completed."
                )
            scenario = self._scenario_loader.get(session_record.scenario_id)
            step = self._scenario_engine.get_step(scenario, session_record.current_step_id)
            step_response = self._get_or_create_step_response(db, session_record, step.step_id, step)

            if not step_response.chosen_action_id:
                raise ReflectionOrderError("A decision must be submitted before reflection.")

            now = datetime.now(UTC)
            step_response.reflection_text = request.reflection
            step_response.reflection_confidence = request.confidence
            step_response.reflection_metadata_json = request.metadata
            step_response.reflection_submitted_at = now

            # Reflection closes the current step, then branching decides what comes next.
            next_step_id = self._scenario_engine.resolve_next_step(step, step_response.chosen_action_id)
            is_completed = next_step_id is None

            if is_completed:
                session_record.status = "completed"
                session_record.completed_at = now
                session_record.current_step_id = None
            else:
                session_record.current_step_id = next_step_id

            self._log_event(
                db,
                session_id=session_record.session_id,
                step_id=step.step_id,
                event_type="reflection_submitted",
                payload={
                    "reflection": request.reflection,
                    "confidence": request.confidence,
                    **request.metadata,
                },
            )

            if is_completed:
                self._log_event(
                    db,
                    session_id=session_record.session_id,
                    step_id=step.step_id,
                    event_type="session_completed",
                    payload={"completed_after_step_id": step.step_id},
                )

            db.commit()

            return SubmitReflectionResponse(
                session_id=session_record.session_id,
                step_id=step.step_id,
                saved=True,
                next_step_id=next_step_id,
                is_completed=is_completed,
            )

    def get_session_summary(self, session_id: str) -> SessionSummaryResponse:
        """Return the stored session, step-response, and event-log history."""
        with self._session_factory() as db:
            session_record = self._get_session(db, session_id)

            step_rows = db.scalars(
                select(StepResponseRecord)
                .where(StepResponseRecord.session_id == session_id)
                .order_by(StepResponseRecord.created_at.asc())
            ).all()
            event_rows = db.scalars(
                select(EventLogRecord)
                .where(EventLogRecord.session_id == session_id)
                .order_by(EventLogRecord.created_at.asc())
            ).all()

            return SessionSummaryResponse(
                session_id=session_record.session_id,
                scenario_id=session_record.scenario_id,
                status=session_record.status,
                started_at=session_record.started_at,
                completed_at=session_record.completed_at,
                current_step_id=session_record.current_step_id,
                session_metadata=session_record.metadata_json,
                step_responses=[
                    StepResponseSummary(
                        step_id=row.step_id,
                        phase=row.phase,
                        advisor_outputs=[
                            AdvisorOutput.model_validate(output) for output in row.advisor_outputs_json
                        ],
                        chosen_action_id=row.chosen_action_id,
                        rationale=row.rationale,
                        decision_metadata=row.decision_metadata_json,
                        reflection_text=row.reflection_text,
                        reflection_confidence=row.reflection_confidence,
                        reflection_metadata=row.reflection_metadata_json,
                        shown_at=row.shown_at,
                        decision_submitted_at=row.decision_submitted_at,
                        reflection_submitted_at=row.reflection_submitted_at,
                    )
                    for row in step_rows
                ],
                event_logs=[
                    EventLogSummary(
                        event_id=row.event_id,
                        step_id=row.step_id,
                        event_type=row.event_type,
                        payload=row.payload_json,
                        created_at=row.created_at,
                    )
                    for row in event_rows
                ],
            )

    def _get_or_create_step_response(
        self,
        db: Session,
        session_record: SessionRecord,
        step_id: str,
        step,
    ) -> StepResponseRecord:
        """Fetch the stored step snapshot or create it the first time the step is viewed."""
        row = db.scalar(
            select(StepResponseRecord).where(
                StepResponseRecord.session_id == session_record.session_id,
                StepResponseRecord.step_id == step_id,
            )
        )
        if row:
            return row

        # Merge scenario-defined content with advisor metadata and store one step-level snapshot.
        advisor_outputs = [self._build_advisor_output(template.advisor_id, template) for template in step.advisor_outputs]
        row = StepResponseRecord(
            session_id=session_record.session_id,
            step_id=step_id,
            phase=step.phase,
            advisor_outputs_json=[output.model_dump() for output in advisor_outputs],
            shown_at=datetime.now(UTC),
        )
        db.add(row)
        db.flush()
        self._log_event(
            db,
            session_id=session_record.session_id,
            step_id=step_id,
            event_type="step_viewed",
            payload={"advisor_ids": [output.advisor_id for output in advisor_outputs]},
        )
        return row

    def _build_advisor_output(self, advisor_id: str, template) -> AdvisorOutput:
        """Combine advisor identity metadata with step-specific output content."""
        # Scenario YAML provides the step-specific message; advisor YAML provides identity and grounding.
        advisor = self._advisor_registry.get(advisor_id)
        return AdvisorOutput(
            advisor_id=advisor.advisor_id,
            display_name=advisor.display_name,
            role=advisor.role,
            recommendation=template.recommendation,
            rationale=template.rationale,
            confidence=template.confidence,
            source_materials=advisor.source_materials,
        )

    @staticmethod
    def _get_session(db: Session, session_id: str) -> SessionRecord:
        """Load one session row by ID or raise a domain-specific error."""
        record = db.get(SessionRecord, session_id)
        if not record:
            raise SessionNotFoundError(f"Session '{session_id}' was not found.")
        return record

    @staticmethod
    def _maybe_update_session_metadata(
        session_record: SessionRecord,
        step_id: str,
        selected_action,
    ) -> None:
        """Persist session-wide attributes that are chosen during scenario steps."""
        metadata = dict(session_record.metadata_json)
        if step_id == "step_role_select":
            metadata["participant_role"] = selected_action.label
            metadata["participant_role_id"] = selected_action.action_id
            metadata["role_details"] = selected_action.metadata
        session_record.metadata_json = metadata

    @staticmethod
    def _log_event(
        db: Session,
        *,
        session_id: str,
        step_id: str | None,
        event_type: str,
        payload: dict,
    ) -> None:
        """Append one runtime event row to the event log."""
        # Event logs are append-only runtime records of what actually happened.
        db.add(
            EventLogRecord(
                session_id=session_id,
                step_id=step_id,
                event_type=event_type,
                payload_json=payload,
            )
        )
