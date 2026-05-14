from __future__ import annotations

from typing import Any
from uuid import uuid4

from app.scenarios.registry import get_scenario_module
from app.schemas.episode import EpisodeCatalogEntry, ParticipantEpisode
from app.schemas.scoring import EpisodeScoringResponse
from app.schemas.session import (
    AgentTurnRequest,
    AgentTurnResponse,
    AnalyticsDashboardSubmissionRequest,
    AdminSessionSummary,
    CompleteSessionRequest,
    FrontendFlowResponse,
    ParticipantProfile,
    PreQuestionnaireSubmissionRequest,
    ProgressionDecision,
    ReflectionSubmissionRequest,
    SessionEvent,
    SessionEventCreateRequest,
    SessionEventResponse,
    SessionStateResponse,
    StartEpisodeSessionRequest,
    StartEpisodeSessionResponse,
)
from app.services.episodes.engine import EpisodeEngine
from app.services.episodes.loader import EpisodeLoader
from app.services.llm.agent import AgentResponderUnavailable, LLMAgentResponder
from app.services.llm.classifier import LLMSemanticClassifier
from app.services.llm.fallback import ScenarioFallbackAgentResponder
from app.services.llm.grader import LLMGrader
from app.services.scoring.deterministic import DeterministicScorer
from app.services.session_store import SessionRecord, SessionStore


class SessionNotFoundError(KeyError):
    """Raised when a session id does not exist in the in-memory store."""


class InvalidArtifactError(ValueError):
    """Raised when the UI references an artifact outside the active episode."""


class EpisodeUnavailableError(ValueError):
    """Raised when an episode is not available in the current environment."""


class EpisodeSessionService:
    """Coordinate episode launch, event capture, assistant turns, and scoring."""

    def __init__(
        self,
        *,
        episode_loader: EpisodeLoader,
        episode_engine: EpisodeEngine,
        scorer: DeterministicScorer,
        semantic_classifier: LLMSemanticClassifier,
        llm_grader: LLMGrader,
        agent_responder: LLMAgentResponder,
        fallback_agent_responder: ScenarioFallbackAgentResponder,
        assistant_fallback_enabled: bool,
        session_store: SessionStore,
        environment: str,
    ) -> None:
        self._episode_loader = episode_loader
        self._episode_engine = episode_engine
        self._scorer = scorer
        self._semantic_classifier = semantic_classifier
        self._llm_grader = llm_grader
        self._agent_responder = agent_responder
        self._fallback_agent_responder = fallback_agent_responder
        self._assistant_fallback_enabled = assistant_fallback_enabled
        self._session_store = session_store
        self._environment = environment

    def frontend_flow(self) -> FrontendFlowResponse:
        """Return the planned route order for the unified frontend shell."""
        entries = self.list_episodes()
        default_episode_id = ""
        if entries:
            default_episode_id = (
                "q3_budget_summary_v1"
                if any(entry.episode_id == "q3_budget_summary_v1" for entry in entries)
                else entries[0].episode_id
            )
        return FrontendFlowResponse(
            default_episode_id=default_episode_id,
            routes=[
                {"path": "/", "label": "Pre-questionnaire"},
                {"path": "/simulation", "label": "Interactive desktop episode"},
                {"path": "/reflection", "label": "Post-simulation reflection"},
                {"path": "/analytics", "label": "Scores and analytics"},
            ],
            backend_capabilities={
                "episode_packets": True,
                "session_event_logging": True,
                "scenario_bound_assistant": True,
                "assistant_provider": self._agent_responder.provider,
                "assistant_fallback_enabled": self._assistant_fallback_enabled,
                "deterministic_scoring": True,
                "semantic_classifier_provider": self._semantic_classifier.provider,
                "llm_grader_provider": self._llm_grader.provider,
                "environment": self._environment,
                "session_store": self._session_store.backend_name,
            },
        )

    def list_episodes(self) -> list[EpisodeCatalogEntry]:
        """Return participant-safe catalog entries."""
        return [
            entry
            for entry in self._episode_loader.list_entries()
            if self._status_allowed(entry.status)
        ]

    def get_participant_episode(self, episode_id: str) -> ParticipantEpisode:
        """Return the participant-safe version of one full episode packet."""
        episode = self._episode_loader.get(episode_id)
        self._ensure_episode_available(episode.status)
        return self._episode_engine.participant_view(episode)

    def start_session(
        self,
        request: StartEpisodeSessionRequest,
    ) -> StartEpisodeSessionResponse:
        """Create an in-memory session and return the episode launch payload."""
        participant_episode = self.get_participant_episode(request.episode_id)
        session_id = str(uuid4())
        participant_run_id = f"run-{uuid4()}"
        record = SessionRecord(
            session_id=session_id,
            participant_run_id=participant_run_id,
            episode_id=request.episode_id,
            participant_profile=request.participant_profile,
            participant_episode=participant_episode,
            environment=self._environment,
        )
        self._session_store.save(record)
        return StartEpisodeSessionResponse(
            session_id=session_id,
            participant_run_id=participant_run_id,
            episode_id=request.episode_id,
            status=record.status,
            participant_episode=participant_episode,
        )

    def generate_agent_turn(
        self,
        session_id: str,
        request: AgentTurnRequest,
        background_tasks: Any | None = None,
    ) -> AgentTurnResponse:
        """Log the participant message and append a bounded dynamic agent reply."""
        record = self._get_record(session_id)
        for artifact_id in request.referenced_artifact_ids:
            self._validate_artifact(record, artifact_id)

        user_event = self._build_event(
            record=record,
            event_type="user_message",
            actor="participant",
            content=request.message,
            artifact_id=None,
            metadata=self._participant_event_metadata(
                record=record,
                event_type="user_message",
                content=request.message,
                metadata={
                    **request.metadata,
                    "referenced_artifact_ids": request.referenced_artifact_ids,
                    "generated_agent_turn": True,
                },
            ),
        )
        self._append_event(record, user_event)
        self._schedule_semantic_classification(record, user_event, background_tasks)

        try:
            episode = self._episode_loader.get(record.episode_id)
            response_text, prompt_version, model = self._agent_responder.generate(
                episode=episode,
                events=record.events,
                latest_user_message=request.message,
                referenced_artifact_ids=request.referenced_artifact_ids,
            )
            agent_event = self._build_event(
                record=record,
                event_type="agent_message",
                actor="agent",
                content=response_text,
                artifact_id=None,
                metadata={
                    "provider": self._agent_responder.provider,
                    "model": model,
                    "prompt_version": prompt_version,
                    "bounded_context": True,
                    "referenced_artifact_ids": request.referenced_artifact_ids,
                },
            )
            self._append_event(record, agent_event)
            progression = self._evaluate_progression(record)
            self._append_progression_events(record, progression)
            return AgentTurnResponse(
                session_id=session_id,
                status="completed",
                provider=self._agent_responder.provider,
                model=model,
                prompt_version=prompt_version,
                user_event=user_event,
                agent_event=agent_event,
                progression=progression,
            )
        except AgentResponderUnavailable as exc:
            if self._assistant_fallback_enabled:
                episode = self._episode_loader.get(record.episode_id)
                fallback_reply = self._fallback_agent_responder.generate(
                    episode=episode,
                    events=record.events,
                    latest_user_message=request.message,
                    referenced_artifact_ids=request.referenced_artifact_ids,
                )
                agent_event = self._build_event(
                    record=record,
                    event_type="agent_message",
                    actor="agent",
                    content=fallback_reply.text,
                    artifact_id=None,
                    metadata={
                        "provider": self._fallback_agent_responder.provider,
                        "model": fallback_reply.model,
                        "prompt_version": fallback_reply.prompt_version,
                        "bounded_context": True,
                        "fallback_reason": str(exc),
                        "referenced_artifact_ids": request.referenced_artifact_ids,
                    },
                )
                self._append_event(record, agent_event)
                progression = self._evaluate_progression(record)
                self._append_progression_events(record, progression)
                return AgentTurnResponse(
                    session_id=session_id,
                    status="fallback",
                    provider=self._fallback_agent_responder.provider,
                    model=fallback_reply.model,
                    prompt_version=fallback_reply.prompt_version,
                    user_event=user_event,
                    agent_event=agent_event,
                    progression=progression,
                )

            return AgentTurnResponse(
                session_id=session_id,
                status="disabled",
                provider=self._agent_responder.provider,
                prompt_version=self._agent_responder.prompt_version(),
                user_event=user_event,
                error=str(exc),
            )
        except Exception as exc:  # pragma: no cover - defensive provider boundary
            if self._assistant_fallback_enabled:
                episode = self._episode_loader.get(record.episode_id)
                fallback_reply = self._fallback_agent_responder.generate(
                    episode=episode,
                    events=record.events,
                    latest_user_message=request.message,
                    referenced_artifact_ids=request.referenced_artifact_ids,
                )
                agent_event = self._build_event(
                    record=record,
                    event_type="agent_message",
                    actor="agent",
                    content=fallback_reply.text,
                    artifact_id=None,
                    metadata={
                        "provider": self._fallback_agent_responder.provider,
                        "model": fallback_reply.model,
                        "prompt_version": fallback_reply.prompt_version,
                        "bounded_context": True,
                        "fallback_reason": str(exc),
                        "referenced_artifact_ids": request.referenced_artifact_ids,
                    },
                )
                self._append_event(record, agent_event)
                progression = self._evaluate_progression(record)
                self._append_progression_events(record, progression)
                return AgentTurnResponse(
                    session_id=session_id,
                    status="fallback",
                    provider=self._fallback_agent_responder.provider,
                    model=fallback_reply.model,
                    prompt_version=fallback_reply.prompt_version,
                    user_event=user_event,
                    agent_event=agent_event,
                    progression=progression,
                )

            return AgentTurnResponse(
                session_id=session_id,
                status="failed",
                provider=self._agent_responder.provider,
                prompt_version=self._agent_responder.prompt_version(),
                user_event=user_event,
                error=str(exc),
            )

    def submit_pre_questionnaire(
        self,
        session_id: str,
        request: PreQuestionnaireSubmissionRequest,
    ) -> SessionEventResponse:
        """Capture baseline survey answers without mixing them into chat events."""
        record = self._get_record(session_id)
        questionnaire = request.model_dump(mode="json")
        record.pre_questionnaire = questionnaire
        event = self._build_event(
            record=record,
            event_type="pre_questionnaire_submitted",
            actor="participant",
            content=None,
            artifact_id=None,
            metadata=questionnaire,
        )
        self._append_event(record, event)
        self._session_store.save(record)
        return SessionEventResponse(session_id=session_id, event=event)

    def submit_reflection(
        self,
        session_id: str,
        request: ReflectionSubmissionRequest,
    ) -> SessionEventResponse:
        """Capture post-simulation motivation answers as a separate event."""
        record = self._get_record(session_id)
        questionnaire = request.model_dump(mode="json")
        record.post_questionnaire = questionnaire
        event = self._build_event(
            record=record,
            event_type="post_reflection_submitted",
            actor="participant",
            content=self._reflection_excerpt(request),
            artifact_id=None,
            metadata=questionnaire,
        )
        self._append_event(record, event)
        self._session_store.save(record)
        return SessionEventResponse(session_id=session_id, event=event)

    def submit_analytics_dashboard(
        self,
        session_id: str,
        request: AnalyticsDashboardSubmissionRequest,
    ) -> SessionEventResponse:
        """Capture the participant-facing final dashboard as persisted session data."""
        record = self._get_record(session_id)
        dashboard = request.model_dump(mode="json")
        record.analytics_dashboard = dashboard
        event = self._build_event(
            record=record,
            event_type="analytics_dashboard_generated",
            actor="evaluator",
            content=None,
            artifact_id=None,
            metadata=dashboard,
        )
        self._append_event(record, event)
        self._session_store.save(record)
        return SessionEventResponse(session_id=session_id, event=event)

    def complete_session(
        self,
        session_id: str,
        request: CompleteSessionRequest,
        background_tasks: Any | None = None,
    ) -> SessionEventResponse:
        """Mark the session complete, optionally including final participant text."""
        record = self._get_record(session_id)
        event = self._build_event(
            record=record,
            event_type="scenario_completed",
            actor="participant",
            content=request.final_response,
            artifact_id=None,
            metadata=self._participant_event_metadata(
                record=record,
                event_type="scenario_completed",
                content=request.final_response,
                metadata={
                    **request.metadata,
                    "completion_reason": request.reason,
                },
            ),
        )
        self._append_event(record, event)
        self._schedule_semantic_classification(record, event, background_tasks)
        record.status = "completed"
        record.completed_at = event.created_at
        self._session_store.save(record)
        return SessionEventResponse(session_id=session_id, event=event)

    def append_event(
        self,
        session_id: str,
        request: SessionEventCreateRequest,
        background_tasks: Any | None = None,
    ) -> SessionEventResponse:
        """Append one UI/runtime event to a session."""
        record = self._get_record(session_id)
        if request.artifact_id is not None:
            self._validate_artifact(record, request.artifact_id)

        event = self._build_event(
            record=record,
            event_type=request.event_type,
            actor=request.actor,
            content=request.content,
            artifact_id=request.artifact_id,
            metadata=self._participant_event_metadata(
                record=record,
                event_type=request.event_type,
                content=request.content,
                metadata=request.metadata,
            )
            if request.actor == "participant"
            else request.metadata,
        )
        self._append_event(record, event)
        self._schedule_semantic_classification(record, event, background_tasks)
        if request.event_type == "scenario_completed":
            record.status = "completed"
            record.completed_at = event.created_at
        self._session_store.save(record)
        return SessionEventResponse(session_id=session_id, event=event)

    def get_state(self, session_id: str) -> SessionStateResponse:
        """Return current session state."""
        record = self._get_record(session_id)
        return self._state_response(record)

    def list_admin_sessions(self) -> list[AdminSessionSummary]:
        """Return compact persisted sessions for the admin dashboard."""
        summaries: list[AdminSessionSummary] = []
        for record in self._session_store.list():
            summaries.append(
                AdminSessionSummary(
                    session_id=record.session_id,
                    participant_run_id=record.participant_run_id,
                    episode_id=record.episode_id,
                    environment=record.environment,
                    status=record.status,
                    participant_profile=record.participant_profile,
                    pre_questionnaire=record.pre_questionnaire,
                    post_questionnaire=record.post_questionnaire,
                    analytics_dashboard=record.analytics_dashboard,
                    event_count=len(record.events),
                    started_at=record.started_at,
                    completed_at=record.completed_at,
                    last_event_at=record.events[-1].created_at if record.events else None,
                )
            )
        return summaries

    def score_session(self, session_id: str) -> EpisodeScoringResponse:
        """Run deterministic scoring and secondary/fallback LLM review for one session."""
        record = self._get_record(session_id)
        episode = self._episode_loader.get(record.episode_id)
        scorable_events = [
            event for event in record.events if event.event_type != "score_generated"
        ]
        deterministic = self._scorer.score(episode=episode, events=scorable_events)
        llm_review = self._llm_grader.review(
            episode=episode,
            events=scorable_events,
            deterministic=deterministic,
            rubric=self._scorer.rubric,
        )
        response = EpisodeScoringResponse(
            session_id=session_id,
            episode_id=record.episode_id,
            deterministic=deterministic,
            llm_review=llm_review,
        )
        score_event = self._build_event(
            record=record,
            event_type="score_generated",
            actor="evaluator",
            content=None,
            artifact_id=None,
            metadata=response.model_dump(mode="json"),
        )
        self._append_event(record, score_event)
        return response

    def _append_event(self, record: SessionRecord, event: SessionEvent) -> None:
        record.events.append(event)
        self._session_store.append_event(record.session_id, event)

    def _schedule_semantic_classification(
        self,
        record: SessionRecord,
        source_event: SessionEvent,
        background_tasks: Any | None,
    ) -> None:
        if source_event.actor != "participant":
            return
        if source_event.event_type not in {
            "user_message",
            "decision_submitted",
            "final_response",
            "scenario_completed",
        }:
            return
        if not source_event.content:
            return

        if background_tasks is not None:
            background_tasks.add_task(
                self._append_semantic_classification,
                record.session_id,
                source_event.event_id,
            )
            return

        self._append_semantic_classification(record.session_id, source_event.event_id)

    def _append_semantic_classification(
        self,
        session_id: str,
        source_event_id: str,
    ) -> None:
        record = self._get_record(session_id)
        source_event = next(
            (event for event in record.events if event.event_id == source_event_id),
            None,
        )
        if source_event is None:
            return
        if any(
            event.event_type == "semantic_classification"
            and event.metadata.get("input_event_id") == source_event_id
            for event in record.events
        ):
            return

        episode = self._episode_loader.get(record.episode_id)
        result = self._semantic_classifier.classify(
            episode=episode,
            events=record.events,
            latest_event=source_event,
        )
        if result is None:
            return

        metadata = result.metadata(source_event_id=source_event.event_id)
        if result.classification is not None:
            source_event.metadata.update(metadata)
            self._session_store.update_event_metadata(
                record.session_id,
                source_event.event_id,
                source_event.metadata,
            )
        classification_event = self._build_event(
            record=record,
            event_type="semantic_classification",
            actor="evaluator",
            content=source_event.content,
            artifact_id=source_event.artifact_id,
            metadata={
                **metadata,
                "input_event_id": source_event.event_id,
                "input_event_type": source_event.event_type,
                "classification_status": metadata["semantic_classifier_status"],
            },
        )
        self._append_event(record, classification_event)

    def _get_record(self, session_id: str) -> SessionRecord:
        record = self._session_store.get(session_id)
        if record is None:
            raise SessionNotFoundError(f"Session '{session_id}' was not found.")
        return record

    def _participant_event_metadata(
        self,
        *,
        record: SessionRecord,
        event_type: str,
        content: str | None,
        metadata: dict,
    ) -> dict:
        return dict(metadata)

    def _ensure_episode_available(self, status: str) -> None:
        if not self._status_allowed(status):
            raise EpisodeUnavailableError(
                f"Episode status '{status}' is not available in {self._environment}."
            )

    def _status_allowed(self, status: str) -> bool:
        if self._environment == "prod":
            return status == "approved"
        return status in {"draft", "review_ready", "approved"}

    @staticmethod
    def _build_event(
        *,
        record: SessionRecord,
        event_type: str,
        actor: str,
        content: str | None,
        artifact_id: str | None,
        metadata: dict,
    ) -> SessionEvent:
        return SessionEvent(
            event_id=str(uuid4()),
            session_id=record.session_id,
            episode_id=record.episode_id,
            event_type=event_type,
            actor=actor,
            content=content,
            artifact_id=artifact_id,
            metadata={
                **metadata,
                "environment": record.environment,
                "participant_run_id": record.participant_run_id,
                "sequence_index": len(record.events),
            },
        )

    @staticmethod
    def _validate_artifact(record: SessionRecord, artifact_id: str) -> None:
        known_ids = {artifact.artifact_id for artifact in record.participant_episode.artifacts}
        if artifact_id not in known_ids:
            raise InvalidArtifactError(
                f"Artifact '{artifact_id}' is not visible in session '{record.session_id}'."
            )

    @staticmethod
    def _state_response(record: SessionRecord) -> SessionStateResponse:
        return SessionStateResponse(
            session_id=record.session_id,
            participant_run_id=record.participant_run_id,
            episode_id=record.episode_id,
            environment=record.environment,
            status=record.status,
            participant_profile=record.participant_profile,
            participant_episode=record.participant_episode,
            pre_questionnaire=record.pre_questionnaire,
            post_questionnaire=record.post_questionnaire,
            analytics_dashboard=record.analytics_dashboard,
            events=record.events,
            started_at=record.started_at,
            completed_at=record.completed_at,
        )

    @staticmethod
    def _reflection_excerpt(request: ReflectionSubmissionRequest) -> str | None:
        parts = [
            request.main_influence,
            request.trust_reason,
            request.unchecked_reason,
        ]
        text = " ".join(part.strip() for part in parts if part and part.strip())
        return text or None

    def _evaluate_progression(self, record: SessionRecord) -> ProgressionDecision:
        episode = self._episode_loader.get(record.episode_id)
        config = episode.progression
        target_signals = config.target_signals
        met = [
            signal
            for signal in target_signals
            if self._progression_signal_met(signal, record, episode)
        ]
        missing = [signal for signal in target_signals if signal not in met]
        agent_turn_count = sum(
            1 for event in record.events if event.event_type == "agent_message"
        )

        if not missing:
            return ProgressionDecision(
                scenario_id=record.episode_id,
                agent_turn_count=agent_turn_count,
                target_signals_met=met,
                target_signals_missing=missing,
            )

        if any(
            event.event_type == "phase_changed"
            and event.metadata.get("reason") == "force_progress_after_limit"
            for event in record.events
        ):
            return ProgressionDecision(
                scenario_id=record.episode_id,
                agent_turn_count=agent_turn_count,
                target_signals_met=met,
                target_signals_missing=missing,
            )

        if agent_turn_count >= config.force_progress_after_agent_turns:
            return ProgressionDecision(
                scenario_id=record.episode_id,
                agent_turn_count=agent_turn_count,
                target_signals_met=met,
                target_signals_missing=missing,
                intervention_type="forced_progression",
                trigger=f"missing_target_signals_after_{agent_turn_count}_agent_turns",
                message=config.force_progress_message,
                transition_required=True,
            )

        if agent_turn_count == config.strong_nudge_after_agent_turns:
            return ProgressionDecision(
                scenario_id=record.episode_id,
                agent_turn_count=agent_turn_count,
                target_signals_met=met,
                target_signals_missing=missing,
                intervention_type="strong_nudge",
                trigger=f"missing_target_signals_after_{agent_turn_count}_agent_turns",
                message=config.strong_nudge_message,
            )

        if agent_turn_count == config.soft_nudge_after_agent_turns:
            return ProgressionDecision(
                scenario_id=record.episode_id,
                agent_turn_count=agent_turn_count,
                target_signals_met=met,
                target_signals_missing=missing,
                intervention_type="soft_nudge",
                trigger=f"missing_target_signals_after_{agent_turn_count}_agent_turns",
                message=config.soft_nudge_message,
            )

        return ProgressionDecision(
            scenario_id=record.episode_id,
            agent_turn_count=agent_turn_count,
            target_signals_met=met,
            target_signals_missing=missing,
        )

    @staticmethod
    def _progression_signal_met(signal: str, record: SessionRecord, episode) -> bool:
        if signal == "source_artifact_opened":
            source_artifact_ids = {
                artifact.artifact_id
                for artifact in episode.artifacts
                if "source-data" in artifact.tags
            }
            return any(
                event.event_type == "artifact_opened"
                and event.artifact_id in source_artifact_ids
                for event in record.events
            )

        scenario_module = get_scenario_module(episode.episode_id)
        if scenario_module is not None:
            scenario_result = scenario_module.progression_signal_met(
                signal=signal,
                record=record,
                episode=episode,
            )
            if scenario_result is not None:
                return scenario_result

        if signal == "user_asked_for_comparison":
            participant_messages = [
                (event.content or "").lower()
                for event in record.events
                if event.event_type in {"user_message", "decision_submitted", "final_response"}
                and event.content
            ]
            terms = (
                "compare",
                "verify",
                "reconcile",
                "check",
                "source",
                "dashboard",
                "discrepancy",
                "which number",
                "which figure",
                "which value",
                "is right",
                "is correct",
                "confirm",
                "confirmation",
                "validate",
                "cross-check",
                "cross check",
                "look at the file",
                "look at the notes",
                "review the file",
                "review the notes",
            )
            if any(any(term in message for term in terms) for message in participant_messages):
                return True

            stakeholder_error_on_track = (
                episode.episode_id == "stakeholder_report_error_v1"
                and any(
                    (
                        ("13%" in message or "13 percent" in message)
                        and ("3%" in message or "3 percent" in message)
                    )
                    or (
                        ("correct" in message or "correction" in message)
                        and ("stakeholder" in message or "svp" in message)
                    )
                    or (
                        "moderate confidence" in message
                        and ("risk" in message or "dashboard" in message)
                    )
                    for message in participant_messages
                )
            )
            if stakeholder_error_on_track:
                return True

        return False

    def _append_progression_events(
        self,
        record: SessionRecord,
        progression: ProgressionDecision,
    ) -> None:
        if progression.intervention_type == "none":
            return

        if self._progression_event_exists(
            record,
            "intervention_shown",
            progression.intervention_type,
            progression.agent_turn_count,
        ):
            return

        intervention_event = self._build_event(
            record=record,
            event_type="intervention_shown",
            actor="system",
            content=progression.message,
            artifact_id=None,
            metadata=progression.model_dump(mode="json"),
        )
        self._append_event(record, intervention_event)

        if progression.transition_required and not self._progression_event_exists(
            record,
            "phase_changed",
            "forced_progression",
            progression.agent_turn_count,
        ):
            phase_event = self._build_event(
                record=record,
                event_type="phase_changed",
                actor="system",
                content=progression.message,
                artifact_id=None,
                metadata={
                    "from_phase": "scenario_active",
                    "to_phase": "transition",
                    "from_scenario_id": record.episode_id,
                    "to_scenario_id": None,
                    "reason": "force_progress_after_limit",
                    **progression.model_dump(mode="json"),
                },
            )
            self._append_event(record, phase_event)

    @staticmethod
    def _progression_event_exists(
        record: SessionRecord,
        event_type: str,
        intervention_type: str,
        agent_turn_count: int,
    ) -> bool:
        return any(
            event.event_type == event_type
            and event.metadata.get("intervention_type") == intervention_type
            and event.metadata.get("agent_turn_count") == agent_turn_count
            for event in record.events
        )
