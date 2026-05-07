from __future__ import annotations

from uuid import uuid4

from app.schemas.episode import EpisodeCatalogEntry, ParticipantEpisode
from app.schemas.scoring import EpisodeScoringResponse
from app.schemas.session import (
    AgentTurnRequest,
    AgentTurnResponse,
    AdminSessionSummary,
    CompleteSessionRequest,
    FrontendFlowResponse,
    ParticipantProfile,
    PreQuestionnaireSubmissionRequest,
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
                "stakeholder_report_error_v1"
                if any(entry.episode_id == "stakeholder_report_error_v1" for entry in entries)
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
        record = SessionRecord(
            session_id=session_id,
            episode_id=request.episode_id,
            participant_profile=request.participant_profile,
            participant_episode=participant_episode,
            environment=self._environment,
        )
        self._session_store.save(record)
        return StartEpisodeSessionResponse(
            session_id=session_id,
            episode_id=request.episode_id,
            status=record.status,
            participant_episode=participant_episode,
        )

    def generate_agent_turn(
        self,
        session_id: str,
        request: AgentTurnRequest,
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
            metadata={
                **request.metadata,
                "referenced_artifact_ids": request.referenced_artifact_ids,
                "generated_agent_turn": True,
            },
        )
        record.events.append(user_event)
        self._session_store.save(record)

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
            record.events.append(agent_event)
            self._session_store.save(record)
            return AgentTurnResponse(
                session_id=session_id,
                status="completed",
                provider=self._agent_responder.provider,
                model=model,
                prompt_version=prompt_version,
                user_event=user_event,
                agent_event=agent_event,
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
                record.events.append(agent_event)
                self._session_store.save(record)
                return AgentTurnResponse(
                    session_id=session_id,
                    status="fallback",
                    provider=self._fallback_agent_responder.provider,
                    model=fallback_reply.model,
                    prompt_version=fallback_reply.prompt_version,
                    user_event=user_event,
                    agent_event=agent_event,
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
        event = self._build_event(
            record=record,
            event_type="pre_questionnaire_submitted",
            actor="participant",
            content=None,
            artifact_id=None,
            metadata=request.model_dump(mode="json"),
        )
        record.events.append(event)
        self._session_store.save(record)
        return SessionEventResponse(session_id=session_id, event=event)

    def submit_reflection(
        self,
        session_id: str,
        request: ReflectionSubmissionRequest,
    ) -> SessionEventResponse:
        """Capture post-simulation motivation answers as a separate event."""
        record = self._get_record(session_id)
        event = self._build_event(
            record=record,
            event_type="post_reflection_submitted",
            actor="participant",
            content=self._reflection_excerpt(request),
            artifact_id=None,
            metadata=request.model_dump(mode="json"),
        )
        record.events.append(event)
        self._session_store.save(record)
        return SessionEventResponse(session_id=session_id, event=event)

    def complete_session(
        self,
        session_id: str,
        request: CompleteSessionRequest,
    ) -> SessionEventResponse:
        """Mark the session complete, optionally including final participant text."""
        record = self._get_record(session_id)
        event = self._build_event(
            record=record,
            event_type="scenario_completed",
            actor="participant",
            content=request.final_response,
            artifact_id=None,
            metadata={
                **request.metadata,
                "completion_reason": request.reason,
            },
        )
        record.events.append(event)
        record.status = "completed"
        record.completed_at = event.created_at
        self._session_store.save(record)
        return SessionEventResponse(session_id=session_id, event=event)

    def append_event(
        self,
        session_id: str,
        request: SessionEventCreateRequest,
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
            metadata=request.metadata,
        )
        record.events.append(event)
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
                    episode_id=record.episode_id,
                    environment=record.environment,
                    status=record.status,
                    participant_profile=record.participant_profile,
                    event_count=len(record.events),
                    started_at=record.started_at,
                    completed_at=record.completed_at,
                    last_event_at=record.events[-1].created_at if record.events else None,
                )
            )
        return summaries

    def score_session(self, session_id: str) -> EpisodeScoringResponse:
        """Run deterministic scoring and optional LLM review for one session."""
        record = self._get_record(session_id)
        episode = self._episode_loader.get(record.episode_id)
        deterministic = self._scorer.score(episode=episode, events=record.events)
        llm_review = self._llm_grader.review(
            episode=episode,
            events=record.events,
            deterministic=deterministic,
            rubric=self._scorer.rubric,
        )
        return EpisodeScoringResponse(
            session_id=session_id,
            episode_id=record.episode_id,
            deterministic=deterministic,
            llm_review=llm_review,
        )

    def _get_record(self, session_id: str) -> SessionRecord:
        record = self._session_store.get(session_id)
        if record is None:
            raise SessionNotFoundError(f"Session '{session_id}' was not found.")
        return record

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
            episode_id=record.episode_id,
            environment=record.environment,
            status=record.status,
            participant_profile=record.participant_profile,
            participant_episode=record.participant_episode,
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
