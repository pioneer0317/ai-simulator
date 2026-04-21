from __future__ import annotations

from datetime import UTC, datetime
from io import StringIO
import csv

from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import Base
from app.db.models.agent_output import AgentOutput
from app.db.models.event_log import EventLog
from app.db.models.human_action import HumanAction
from app.db.models.reflection_response import ReflectionResponse
from app.db.models.session import Session as SessionRecord
from app.schemas.advisors import AdvisorOutput
from app.schemas.scenario import ScenarioCatalogEntry, ScenarioDefinition, ScenarioStep
from app.schemas.sessions import (
    CurrentStepResponse,
    EventLogSummary,
    SessionSummaryResponse,
    StartSessionRequest,
    StartSessionResponse,
    StepResponseSummary,
    StepView,
    StudyContext,
    SubmitActionRequest,
    SubmitActionResponse,
    SubmitReflectionRequest,
    SubmitReflectionResponse,
)
from app.services.advisors import AdvisorRegistry
from app.services.scenarios.engine import ScenarioEngine
from app.services.scenarios.loader import ScenarioLoader


class SimulatorError(Exception):
    """Base simulator error."""


class ScenarioNotFoundError(SimulatorError):
    """Raised when a scenario config cannot be found."""


class SessionNotFoundError(SimulatorError):
    """Raised when a session row is missing."""


class UnknownActionError(SimulatorError):
    """Raised when the participant submits an invalid step action."""


class SessionAlreadyCompletedError(SimulatorError):
    """Raised when a completed session is treated as active."""


class ReflectionOrderError(SimulatorError):
    """Raised when reflection is submitted before a decision exists."""


class SimulatorService:
    """Canonical persisted simulator runtime used by the Phase 2 API."""

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
        self._engine = engine
        self._session_factory = session_factory
        self._scenario_loader = scenario_loader
        self._scenario_engine = scenario_engine
        self._advisor_registry = advisor_registry
        self._default_scenario_id = default_scenario_id

    def create_tables(self) -> None:
        """Create database tables for the persisted simulator backend."""
        Base.metadata.create_all(bind=self._engine)

    def start_session(self, request: StartSessionRequest) -> StartSessionResponse:
        """Create a new session and position it at the scenario's first step."""
        scenario_id = request.scenario_id or self._default_scenario_id
        scenario = self._get_scenario(scenario_id)
        first_step = self._scenario_engine.get_first_step(scenario)
        study_context = self._build_study_context(request, scenario.scenario_id)
        session_metadata = self._build_session_metadata(request, study_context)

        with self._session_factory() as db:
            record = SessionRecord(
                participant_id=request.participant_id,
                scenario_id=scenario.scenario_id,
                current_step_id=first_step.step_id,
                metadata_json=session_metadata,
            )
            db.add(record)
            db.flush()
            self._log_event(
                db,
                session_id=record.session_id,
                scenario_id=scenario.scenario_id,
                step_id=first_step.step_id,
                event_type="session_started",
                payload={
                    "scenario_id": scenario.scenario_id,
                    "participant_id": request.participant_id,
                    "run_mode": study_context.run_mode,
                    "scenario_variant": study_context.scenario_variant,
                    "participant_archetype": study_context.participant_archetype,
                    "has_ai_training": study_context.has_ai_training,
                },
            )
            db.commit()

            return StartSessionResponse(
                session_id=record.session_id,
                scenario_id=record.scenario_id,
                current_step_id=record.current_step_id or first_step.step_id,
                status=record.status,
                study_context=study_context,
            )

    def list_scenarios(self) -> list[ScenarioCatalogEntry]:
        """Return researcher-friendly metadata for every available scenario."""
        return [
            ScenarioCatalogEntry(
                scenario_id=scenario.scenario_id,
                title=scenario.title,
                description=scenario.description,
                human_role=scenario.human_role,
                step_count=len(scenario.steps),
                metadata=scenario.metadata,
            )
            for scenario in self._scenario_loader.list()
        ]

    def get_current_step(self, session_id: str) -> CurrentStepResponse:
        """Return the active step, persisted advisor outputs, and session metadata."""
        with self._session_factory() as db:
            session_record = self._get_session(db, session_id)
            if session_record.status == "completed" or session_record.current_step_id is None:
                raise SessionAlreadyCompletedError(f"Session '{session_id}' is already completed.")

            scenario = self._get_scenario(session_record.scenario_id)
            step = self._get_step(scenario, session_record.current_step_id)
            advisor_outputs = self._get_or_create_advisor_outputs(
                db=db,
                session_record=session_record,
                scenario=scenario,
                step=step,
            )
            chosen_action = self._get_human_action(
                db=db,
                session_id=session_record.session_id,
                step_id=step.step_id,
            )
            db.commit()

            return CurrentStepResponse(
                session_id=session_record.session_id,
                scenario_id=scenario.scenario_id,
                scenario_title=scenario.title,
                human_role=scenario.human_role,
                study_context=self._get_study_context(session_record),
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
                advisor_outputs=advisor_outputs,
                chosen_action_id=chosen_action.action_id if chosen_action else None,
                is_completed=False,
            )

    def submit_action(self, session_id: str, request: SubmitActionRequest) -> SubmitActionResponse:
        """Persist the participant's action and advance when reflection is not required."""
        with self._session_factory() as db:
            session_record = self._get_session(db, session_id)
            if session_record.status == "completed" or session_record.current_step_id is None:
                raise SessionAlreadyCompletedError(f"Session '{session_id}' is already completed.")

            scenario = self._get_scenario(session_record.scenario_id)
            step = self._get_step(scenario, session_record.current_step_id)
            valid_action_ids = {action.action_id for action in step.possible_actions}
            if request.action_id not in valid_action_ids:
                raise UnknownActionError(
                    f"Action '{request.action_id}' is not valid for step '{step.step_id}'."
                )

            existing_action = self._get_human_action(
                db=db,
                session_id=session_record.session_id,
                step_id=step.step_id,
            )
            now = datetime.now(UTC)
            if existing_action is None:
                action_record = HumanAction(
                    session_id=session_record.session_id,
                    step_id=step.step_id,
                    action_id=request.action_id,
                    rationale=request.rationale,
                    metadata_json=request.metadata,
                    submitted_at=now,
                )
                db.add(action_record)
            else:
                existing_action.action_id = request.action_id
                existing_action.rationale = request.rationale
                existing_action.metadata_json = request.metadata
                existing_action.submitted_at = now

            selected_action = next(
                action for action in step.possible_actions if action.action_id == request.action_id
            )
            self._maybe_update_session_metadata(session_record, step.step_id, selected_action)
            self._log_event(
                db,
                session_id=session_record.session_id,
                scenario_id=scenario.scenario_id,
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
                    scenario_id=scenario.scenario_id,
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
        """Persist reflection, then advance the scenario or complete the session."""
        with self._session_factory() as db:
            session_record = self._get_session(db, session_id)
            if session_record.status == "completed" or session_record.current_step_id is None:
                raise SessionAlreadyCompletedError(f"Session '{session_id}' is already completed.")

            scenario = self._get_scenario(session_record.scenario_id)
            step = self._get_step(scenario, session_record.current_step_id)
            action_record = self._get_human_action(
                db=db,
                session_id=session_record.session_id,
                step_id=step.step_id,
            )
            if action_record is None:
                raise ReflectionOrderError("A decision must be submitted before reflection.")

            existing_reflection = self._get_reflection(
                db=db,
                session_id=session_record.session_id,
                step_id=step.step_id,
            )
            now = datetime.now(UTC)
            if existing_reflection is None:
                reflection_record = ReflectionResponse(
                    session_id=session_record.session_id,
                    step_id=step.step_id,
                    reflection_text=request.reflection,
                    confidence=request.confidence,
                    metadata_json=request.metadata,
                    submitted_at=now,
                )
                db.add(reflection_record)
            else:
                existing_reflection.reflection_text = request.reflection
                existing_reflection.confidence = request.confidence
                existing_reflection.metadata_json = request.metadata
                existing_reflection.submitted_at = now

            next_step_id = self._scenario_engine.resolve_next_step(step, action_record.action_id)
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
                scenario_id=scenario.scenario_id,
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
                    scenario_id=scenario.scenario_id,
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
        """Return a researcher-friendly aggregate summary for one session."""
        with self._session_factory() as db:
            session_record = self._get_session(db, session_id)
            scenario = self._get_scenario(session_record.scenario_id)

            advisor_rows = db.scalars(
                select(AgentOutput)
                .where(AgentOutput.session_id == session_id)
                .order_by(AgentOutput.created_at.asc())
            ).all()
            action_rows = db.scalars(
                select(HumanAction)
                .where(HumanAction.session_id == session_id)
                .order_by(HumanAction.submitted_at.asc())
            ).all()
            reflection_rows = db.scalars(
                select(ReflectionResponse)
                .where(ReflectionResponse.session_id == session_id)
                .order_by(ReflectionResponse.submitted_at.asc())
            ).all()
            event_rows = db.scalars(
                select(EventLog)
                .where(EventLog.session_id == session_id)
                .order_by(EventLog.event_timestamp.asc())
            ).all()

            advisor_map: dict[str, list[AgentOutput]] = {}
            for row in advisor_rows:
                advisor_map.setdefault(row.step_id or "", []).append(row)

            action_map = {row.step_id or "": row for row in action_rows}
            reflection_map = {row.step_id or "": row for row in reflection_rows}
            shown_map = {
                (row.step_id or ""): row
                for row in event_rows
                if row.event_type == "step_viewed" and row.step_id
            }

            step_summaries: list[StepResponseSummary] = []
            for step in scenario.steps:
                step_key = step.step_id
                advisor_group = advisor_map.get(step_key, [])
                action_record = action_map.get(step_key)
                reflection_record = reflection_map.get(step_key)
                shown_event = shown_map.get(step_key)

                if not advisor_group and action_record is None and reflection_record is None and shown_event is None:
                    continue

                step_summaries.append(
                    StepResponseSummary(
                        step_id=step.step_id,
                        phase=step.phase,
                        advisor_outputs=[self._advisor_output_from_row(row) for row in advisor_group],
                        chosen_action_id=action_record.action_id if action_record else None,
                        rationale=action_record.rationale if action_record else None,
                        decision_metadata=action_record.metadata_json if action_record else {},
                        reflection_text=reflection_record.reflection_text if reflection_record else None,
                        reflection_confidence=(
                            float(reflection_record.confidence)
                            if reflection_record and reflection_record.confidence is not None
                            else None
                        ),
                        reflection_metadata=reflection_record.metadata_json if reflection_record else {},
                        shown_at=shown_event.event_timestamp if shown_event else None,
                        decision_submitted_at=action_record.submitted_at if action_record else None,
                        reflection_submitted_at=reflection_record.submitted_at if reflection_record else None,
                    )
                )

            return SessionSummaryResponse(
                session_id=session_record.session_id,
                scenario_id=session_record.scenario_id,
                scenario_title=scenario.title,
                scenario_description=scenario.description,
                scenario_metadata=scenario.metadata,
                status=session_record.status,
                started_at=session_record.started_at,
                completed_at=session_record.completed_at,
                current_step_id=session_record.current_step_id,
                study_context=self._get_study_context(session_record),
                session_metadata=session_record.metadata_json,
                step_responses=step_summaries,
                event_logs=[
                    EventLogSummary(
                        event_id=row.event_id,
                        step_id=row.step_id,
                        event_type=row.event_type,
                        payload=row.metadata_json,
                        created_at=row.event_timestamp,
                    )
                    for row in event_rows
                ],
            )

    def export_session_csv(self, session_id: str, view: str) -> tuple[str, str]:
        """Serialize step-level or event-level session data into CSV for analytics."""
        summary = self.get_session_summary(session_id)
        if view == "steps":
            return self._build_steps_csv(summary), f"{session_id}_steps.csv"
        if view == "events":
            return self._build_events_csv(summary), f"{session_id}_events.csv"
        raise ValueError(f"Unsupported export view '{view}'.")

    def _get_or_create_advisor_outputs(
        self,
        *,
        db: Session,
        session_record: SessionRecord,
        scenario: ScenarioDefinition,
        step: ScenarioStep,
    ) -> list[AdvisorOutput]:
        """Persist advisor outputs once per step and reuse them on later reads."""
        existing_rows = db.scalars(
            select(AgentOutput)
            .where(
                AgentOutput.session_id == session_record.session_id,
                AgentOutput.step_id == step.step_id,
            )
            .order_by(AgentOutput.created_at.asc())
        ).all()
        if existing_rows:
            return [self._advisor_output_from_row(row) for row in existing_rows]

        self._ensure_step_view_logged(
            db=db,
            session_record=session_record,
            scenario_id=scenario.scenario_id,
            step=step,
            advisor_templates_count=len(step.advisor_outputs),
        )

        created_rows: list[AgentOutput] = []
        for template in step.advisor_outputs:
            output = self._build_advisor_output(template.advisor_id, template)
            row = AgentOutput(
                session_id=session_record.session_id,
                step_id=step.step_id,
                agent_name=output.display_name,
                recommendation=output.recommendation,
                rationale=output.rationale,
                confidence=output.confidence,
                metadata_json={
                    "advisor_id": output.advisor_id,
                    "role": output.role,
                    "source_materials": output.source_materials,
                },
            )
            db.add(row)
            created_rows.append(row)
            self._log_event(
                db,
                session_id=session_record.session_id,
                scenario_id=scenario.scenario_id,
                step_id=step.step_id,
                event_type="advisor_output_shown",
                payload=output.model_dump(),
            )

        if not step.advisor_outputs:
            return []

        db.flush()
        return [self._advisor_output_from_row(row) for row in created_rows]

    def _ensure_step_view_logged(
        self,
        *,
        db: Session,
        session_record: SessionRecord,
        scenario_id: str,
        step: ScenarioStep,
        advisor_templates_count: int,
    ) -> None:
        """Write the first-view event for a step exactly once."""
        existing_event = db.scalar(
            select(EventLog).where(
                EventLog.session_id == session_record.session_id,
                EventLog.step_id == step.step_id,
                EventLog.event_type == "step_viewed",
            )
        )
        if existing_event is not None:
            return

        self._log_event(
            db,
            session_id=session_record.session_id,
            scenario_id=scenario_id,
            step_id=step.step_id,
            event_type="step_viewed",
            payload={"advisor_count": advisor_templates_count, "phase": step.phase},
        )

    def _build_advisor_output(self, advisor_id: str, template) -> AdvisorOutput:
        """Merge advisor identity metadata with step-authored output content."""
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
    def _advisor_output_from_row(row: AgentOutput) -> AdvisorOutput:
        """Rehydrate one stored advisor output row into the API schema."""
        return AdvisorOutput(
            advisor_id=row.metadata_json.get("advisor_id", row.agent_name),
            display_name=row.agent_name,
            role=row.metadata_json.get("role", ""),
            recommendation=row.recommendation,
            rationale=row.rationale,
            confidence=float(row.confidence),
            source_materials=row.metadata_json.get("source_materials", []),
        )

    @staticmethod
    def _build_steps_csv(summary: SessionSummaryResponse) -> str:
        """Flatten step summaries into CSV rows for downstream analysis."""
        buffer = StringIO()
        participant_role = summary.study_context.participant_role or summary.session_metadata.get(
            "participant_role",
            "",
        )
        category = summary.scenario_metadata.get("category", "")
        writer = csv.DictWriter(
            buffer,
            fieldnames=[
                "session_id",
                "scenario_id",
                "scenario_title",
                "scenario_category",
                "participant_role",
                "run_mode",
                "step_id",
                "phase",
                "chosen_action_id",
                "rationale",
                "reflection_text",
                "reflection_confidence",
                "decision_metadata",
                "reflection_metadata",
                "advisor_names",
                "advisor_recommendations",
                "shown_at",
                "decision_submitted_at",
                "reflection_submitted_at",
            ],
        )
        writer.writeheader()
        for step in summary.step_responses:
            writer.writerow(
                {
                    "session_id": summary.session_id,
                    "scenario_id": summary.scenario_id,
                    "scenario_title": summary.scenario_title,
                    "scenario_category": category,
                    "participant_role": participant_role,
                    "run_mode": summary.study_context.run_mode,
                    "step_id": step.step_id,
                    "phase": step.phase,
                    "chosen_action_id": step.chosen_action_id,
                    "rationale": step.rationale,
                    "reflection_text": step.reflection_text,
                    "reflection_confidence": step.reflection_confidence,
                    "decision_metadata": step.decision_metadata,
                    "reflection_metadata": step.reflection_metadata,
                    "advisor_names": " | ".join(output.display_name for output in step.advisor_outputs),
                    "advisor_recommendations": " | ".join(
                        output.recommendation for output in step.advisor_outputs
                    ),
                    "shown_at": step.shown_at.isoformat() if step.shown_at else "",
                    "decision_submitted_at": (
                        step.decision_submitted_at.isoformat() if step.decision_submitted_at else ""
                    ),
                    "reflection_submitted_at": (
                        step.reflection_submitted_at.isoformat() if step.reflection_submitted_at else ""
                    ),
                }
            )
        return buffer.getvalue()

    @staticmethod
    def _build_events_csv(summary: SessionSummaryResponse) -> str:
        """Flatten raw event logs into CSV rows for audit and analytics workflows."""
        buffer = StringIO()
        participant_role = summary.study_context.participant_role or summary.session_metadata.get(
            "participant_role",
            "",
        )
        category = summary.scenario_metadata.get("category", "")
        writer = csv.DictWriter(
            buffer,
            fieldnames=[
                "session_id",
                "scenario_id",
                "scenario_title",
                "scenario_category",
                "participant_role",
                "run_mode",
                "event_id",
                "step_id",
                "event_type",
                "payload",
                "created_at",
            ],
        )
        writer.writeheader()
        for event in summary.event_logs:
            writer.writerow(
                {
                    "session_id": summary.session_id,
                    "scenario_id": summary.scenario_id,
                    "scenario_title": summary.scenario_title,
                    "scenario_category": category,
                    "participant_role": participant_role,
                    "run_mode": summary.study_context.run_mode,
                    "event_id": event.event_id,
                    "step_id": event.step_id,
                    "event_type": event.event_type,
                    "payload": event.payload,
                    "created_at": event.created_at.isoformat(),
                }
            )
        return buffer.getvalue()

    def _get_scenario(self, scenario_id: str) -> ScenarioDefinition:
        """Load one scenario or raise a domain-specific not-found error."""
        try:
            return self._scenario_loader.get(scenario_id)
        except KeyError as exc:
            raise ScenarioNotFoundError(str(exc)) from exc

    def _get_step(self, scenario: ScenarioDefinition, step_id: str) -> ScenarioStep:
        """Return one scenario step or convert lookup failures into domain errors."""
        try:
            return self._scenario_engine.get_step(scenario, step_id)
        except KeyError as exc:
            raise ScenarioNotFoundError(str(exc)) from exc

    @staticmethod
    def _get_session(db: Session, session_id: str) -> SessionRecord:
        """Load one session row by ID or raise if it does not exist."""
        record = db.get(SessionRecord, session_id)
        if record is None:
            raise SessionNotFoundError(f"Session '{session_id}' was not found.")
        return record

    @staticmethod
    def _get_human_action(db: Session, session_id: str, step_id: str) -> HumanAction | None:
        """Return the latest stored human action for one step, if present."""
        return db.scalar(
            select(HumanAction)
            .where(HumanAction.session_id == session_id, HumanAction.step_id == step_id)
            .order_by(HumanAction.submitted_at.desc())
        )

    @staticmethod
    def _get_reflection(db: Session, session_id: str, step_id: str) -> ReflectionResponse | None:
        """Return the latest stored reflection for one step, if present."""
        return db.scalar(
            select(ReflectionResponse)
            .where(
                ReflectionResponse.session_id == session_id,
                ReflectionResponse.step_id == step_id,
            )
            .order_by(ReflectionResponse.submitted_at.desc())
        )

    @staticmethod
    def _maybe_update_session_metadata(session_record: SessionRecord, step_id: str, selected_action) -> None:
        """Persist session-wide metadata that becomes known during the scenario."""
        metadata = dict(session_record.metadata_json or {})
        study_context = dict(metadata.get("study_context", {}))

        if step_id == "step_role_select":
            metadata["participant_role"] = selected_action.label
            metadata["participant_role_id"] = selected_action.action_id
            metadata["role_details"] = selected_action.metadata
            study_context["participant_role"] = selected_action.label
            study_context["participant_role_id"] = selected_action.action_id

        if study_context:
            metadata["study_context"] = study_context
        session_record.metadata_json = metadata

    @staticmethod
    def _log_event(
        db: Session,
        *,
        session_id: str,
        scenario_id: str,
        step_id: str | None,
        event_type: str,
        payload: dict,
    ) -> None:
        """Append one event row to the persisted event log."""
        db.add(
            EventLog(
                session_id=session_id,
                scenario_id=scenario_id,
                step_id=step_id,
                event_type=event_type,
                metadata_json=payload,
            )
        )

    @staticmethod
    def _build_study_context(request: StartSessionRequest, scenario_id: str) -> StudyContext:
        """Normalize the minimum study metadata captured for each session."""
        payload = request.study_context.model_dump()
        payload["scenario_id"] = scenario_id
        return StudyContext.model_validate(payload)

    @staticmethod
    def _build_session_metadata(request: StartSessionRequest, study_context: StudyContext) -> dict:
        """Embed the structured study context into session metadata."""
        metadata = dict(request.metadata)
        metadata["study_context"] = study_context.model_dump(exclude_none=True)
        return metadata

    @staticmethod
    def _get_study_context(session_record: SessionRecord) -> StudyContext:
        """Backfill structured study metadata for legacy or partial session rows."""
        metadata = dict(session_record.metadata_json or {})
        payload = dict(metadata.get("study_context", {}))

        if "scenario_id" not in payload:
            payload["scenario_id"] = session_record.scenario_id
        if "participant_role" not in payload and metadata.get("participant_role"):
            payload["participant_role"] = metadata["participant_role"]
        if "participant_role_id" not in payload and metadata.get("participant_role_id"):
            payload["participant_role_id"] = metadata["participant_role_id"]

        return StudyContext.model_validate(payload)
