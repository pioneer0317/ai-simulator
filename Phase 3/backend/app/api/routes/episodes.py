from __future__ import annotations

import csv
from io import StringIO

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import Response

from app.schemas.episode import EpisodeCatalogEntry, ParticipantEpisode
from app.schemas.scoring import EpisodeScoringResponse
from app.schemas.session import (
    AgentTurnRequest,
    AgentTurnResponse,
    AnalyticsDashboardSubmissionRequest,
    AdminSessionSummary,
    CompleteSessionRequest,
    FrontendFlowResponse,
    PreQuestionnaireSubmissionRequest,
    ReflectionSubmissionRequest,
    SessionEventCreateRequest,
    SessionEventResponse,
    SessionStateResponse,
    StartEpisodeSessionRequest,
    StartEpisodeSessionResponse,
)
from app.services.episodes.loader import EpisodeNotFoundError
from app.services.sessions import (
    EpisodeSessionService,
    EpisodeUnavailableError,
    InvalidArtifactError,
    SessionNotFoundError,
)

router = APIRouter(tags=["episodes"])


def _service(request: Request) -> EpisodeSessionService:
    return request.app.state.episode_session_service


@router.get("/admin/sessions", response_model=list[AdminSessionSummary])
def list_admin_sessions(request: Request) -> list[AdminSessionSummary]:
    """Return persisted session summaries for admin review."""
    return _service(request).list_admin_sessions()


@router.get("/admin/events.csv")
def export_admin_events_csv(request: Request) -> Response:
    """Export persisted event logs as CSV for spreadsheet/BI review."""
    output = StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=[
            "session_id",
            "participant_run_id",
            "episode_id",
            "environment",
            "status",
            "participant_id",
            "event_id",
            "sequence_index",
            "event_type",
            "actor",
            "artifact_id",
            "content",
            "created_at",
            "metadata_json",
        ],
    )
    writer.writeheader()

    for summary in _service(request).list_admin_sessions():
        try:
            state = _service(request).get_state(summary.session_id)
        except SessionNotFoundError:
            continue
        for position, event in enumerate(state.events):
            writer.writerow(
                {
                    "session_id": state.session_id,
                    "participant_run_id": state.participant_run_id,
                    "episode_id": state.episode_id,
                    "environment": state.environment,
                    "status": state.status,
                    "participant_id": state.participant_profile.participant_id or "",
                    "event_id": event.event_id,
                    "sequence_index": event.metadata.get("sequence_index", position),
                    "event_type": event.event_type,
                    "actor": event.actor,
                    "artifact_id": event.artifact_id or "",
                    "content": event.content or "",
                    "created_at": event.created_at.isoformat(),
                    "metadata_json": event.model_dump_json(),
                }
            )

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="simulator-events.csv"'},
    )


@router.get("/frontend-flow", response_model=FrontendFlowResponse)
def get_frontend_flow(request: Request) -> FrontendFlowResponse:
    """Describe the pre-questionnaire, desktop episode, and reflection flow."""
    return _service(request).frontend_flow()


@router.get("/episodes", response_model=list[EpisodeCatalogEntry])
def list_episodes(request: Request) -> list[EpisodeCatalogEntry]:
    """List simulator episode packets."""
    return _service(request).list_episodes()


@router.get("/episodes/{episode_id}", response_model=ParticipantEpisode)
def get_episode(episode_id: str, request: Request) -> ParticipantEpisode:
    """Return the participant-safe view of an episode."""
    try:
        return _service(request).get_participant_episode(episode_id)
    except EpisodeNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except EpisodeUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post(
    "/sessions",
    response_model=StartEpisodeSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def start_session(
    payload: StartEpisodeSessionRequest,
    request: Request,
) -> StartEpisodeSessionResponse:
    """Start a simulator episode session."""
    try:
        return _service(request).start_session(payload)
    except EpisodeNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except EpisodeUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/sessions/{session_id}/events", response_model=SessionEventResponse)
def append_event(
    session_id: str,
    payload: SessionEventCreateRequest,
    request: Request,
) -> SessionEventResponse:
    """Append one participant, agent, system, or evaluator event."""
    try:
        return _service(request).append_event(session_id, payload)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except InvalidArtifactError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/sessions/{session_id}/pre-questionnaire", response_model=SessionEventResponse)
def submit_pre_questionnaire(
    session_id: str,
    payload: PreQuestionnaireSubmissionRequest,
    request: Request,
) -> SessionEventResponse:
    """Persist pre-simulation questionnaire answers in the session timeline."""
    try:
        return _service(request).submit_pre_questionnaire(session_id, payload)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/sessions/{session_id}/reflection", response_model=SessionEventResponse)
def submit_reflection(
    session_id: str,
    payload: ReflectionSubmissionRequest,
    request: Request,
) -> SessionEventResponse:
    """Persist post-simulation reflection answers in the session timeline."""
    try:
        return _service(request).submit_reflection(session_id, payload)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/sessions/{session_id}/analytics-dashboard", response_model=SessionEventResponse)
def submit_analytics_dashboard(
    session_id: str,
    payload: AnalyticsDashboardSubmissionRequest,
    request: Request,
) -> SessionEventResponse:
    """Persist the participant-facing final analytics dashboard."""
    try:
        return _service(request).submit_analytics_dashboard(session_id, payload)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/sessions/{session_id}/agent-turn", response_model=AgentTurnResponse)
def generate_agent_turn(
    session_id: str,
    payload: AgentTurnRequest,
    request: Request,
) -> AgentTurnResponse:
    """Log a participant message and generate a bounded dynamic agent reply."""
    try:
        return _service(request).generate_agent_turn(session_id, payload)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except InvalidArtifactError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/sessions/{session_id}/complete", response_model=SessionEventResponse)
def complete_session(
    session_id: str,
    payload: CompleteSessionRequest,
    request: Request,
) -> SessionEventResponse:
    """Mark the episode complete from the combined frontend flow."""
    try:
        return _service(request).complete_session(session_id, payload)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/sessions/{session_id}", response_model=SessionStateResponse)
def get_session(session_id: str, request: Request) -> SessionStateResponse:
    """Return current persisted session state."""
    try:
        return _service(request).get_state(session_id)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/sessions/{session_id}/score", response_model=EpisodeScoringResponse)
def score_session(session_id: str, request: Request) -> EpisodeScoringResponse:
    """Run deterministic scoring plus secondary/fallback LLM grading."""
    try:
        return _service(request).score_session(session_id)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
