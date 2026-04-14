from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status

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
from app.services.simulator import (
    ReflectionOrderError,
    SessionAlreadyCompletedError,
    SessionNotFoundError,
    SimulatorService,
    UnknownActionError,
)


router = APIRouter(prefix="/sessions", tags=["simulator"])


def get_service(request: Request) -> SimulatorService:
    return request.app.state.simulator_service


@router.post("", response_model=StartSessionResponse, status_code=status.HTTP_201_CREATED)
def start_session(request_body: StartSessionRequest, request: Request) -> StartSessionResponse:
    return get_service(request).start_session(request_body)


@router.get("/{session_id}/step", response_model=CurrentStepResponse)
def get_current_step(session_id: str, request: Request) -> CurrentStepResponse:
    try:
        return get_service(request).get_current_step(session_id)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except SessionAlreadyCompletedError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.post("/{session_id}/action", response_model=SubmitActionResponse)
def submit_action(
    session_id: str,
    request_body: SubmitActionRequest,
    request: Request,
) -> SubmitActionResponse:
    try:
        return get_service(request).submit_action(session_id, request_body)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except SessionAlreadyCompletedError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except UnknownActionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/{session_id}/reflection", response_model=SubmitReflectionResponse)
def submit_reflection(
    session_id: str,
    request_body: SubmitReflectionRequest,
    request: Request,
) -> SubmitReflectionResponse:
    try:
        return get_service(request).submit_reflection(session_id, request_body)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except SessionAlreadyCompletedError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except ReflectionOrderError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{session_id}/summary", response_model=SessionSummaryResponse)
def get_session_summary(session_id: str, request: Request) -> SessionSummaryResponse:
    try:
        return get_service(request).get_session_summary(session_id)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
