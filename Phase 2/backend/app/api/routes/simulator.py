from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import PlainTextResponse

from app.api.dependencies.services import get_simulator_service
from app.schemas.sessions import (
    CurrentStepResponse,
    SessionSummaryResponse,
    StartSessionRequest,
    StartSessionResponse,
    SubmitActionRequest,
    SubmitActionResponse,
    SubmitReflectionRequest,
    SubmitReflectionResponse,
)
from app.schemas.scenario import ScenarioCatalogEntry
from app.services.simulator import (
    ReflectionOrderError,
    ScenarioNotFoundError,
    SessionAlreadyCompletedError,
    SessionNotFoundError,
    SimulatorService,
    UnknownActionError,
)

router = APIRouter(prefix="/simulator", tags=["simulator"])


@router.get("/scenarios", response_model=list[ScenarioCatalogEntry])
def list_scenarios(
    simulator_service: SimulatorService = Depends(get_simulator_service),
) -> list[ScenarioCatalogEntry]:
    """Return the scenario catalog used by the launcher UI."""
    return simulator_service.list_scenarios()


@router.post("/sessions", response_model=StartSessionResponse, status_code=status.HTTP_201_CREATED)
def start_session(
    request: StartSessionRequest,
    simulator_service: SimulatorService = Depends(get_simulator_service),
) -> StartSessionResponse:
    try:
        return simulator_service.start_session(request)
    except ScenarioNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/sessions/{session_id}/current-step", response_model=CurrentStepResponse)
def get_current_step(
    session_id: str,
    simulator_service: SimulatorService = Depends(get_simulator_service),
) -> CurrentStepResponse:
    try:
        return simulator_service.get_current_step(session_id)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except SessionAlreadyCompletedError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except ScenarioNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc


@router.post("/sessions/{session_id}/actions", response_model=SubmitActionResponse)
def submit_action(
    session_id: str,
    request: SubmitActionRequest,
    simulator_service: SimulatorService = Depends(get_simulator_service),
) -> SubmitActionResponse:
    try:
        return simulator_service.submit_action(session_id, request)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except SessionAlreadyCompletedError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except UnknownActionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/sessions/{session_id}/reflection", response_model=SubmitReflectionResponse)
def submit_reflection(
    session_id: str,
    request: SubmitReflectionRequest,
    simulator_service: SimulatorService = Depends(get_simulator_service),
) -> SubmitReflectionResponse:
    try:
        return simulator_service.submit_reflection(session_id, request)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except SessionAlreadyCompletedError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except ReflectionOrderError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/sessions/{session_id}/summary", response_model=SessionSummaryResponse)
def get_session_summary(
    session_id: str,
    simulator_service: SimulatorService = Depends(get_simulator_service),
) -> SessionSummaryResponse:
    """Return the persisted end-to-end record for one simulator session."""
    try:
        return simulator_service.get_session_summary(session_id)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/sessions/{session_id}/export", response_class=PlainTextResponse)
def export_session_summary(
    session_id: str,
    view: str = Query(default="steps", pattern="^(steps|events)$"),
    simulator_service: SimulatorService = Depends(get_simulator_service),
) -> PlainTextResponse:
    """Export step-level or event-level session data as analytics-friendly CSV."""
    try:
        csv_text, filename = simulator_service.export_session_csv(session_id, view)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return PlainTextResponse(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
