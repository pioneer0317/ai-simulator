from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies.services import get_prototype_session_service
from app.schemas.prototype import (
    PrototypeSessionCreateRequest,
    PrototypeSessionCreateResponse,
    PrototypeSessionStateResponse,
    PrototypeSessionStateSyncRequest,
)
from app.services.prototype_sessions import (
    PrototypeSessionNotFoundError,
    PrototypeSessionService,
)

router = APIRouter(prefix="/prototype", tags=["prototype"])


@router.post(
    "/sessions",
    response_model=PrototypeSessionCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_prototype_session(
    request: PrototypeSessionCreateRequest,
    prototype_session_service: PrototypeSessionService = Depends(get_prototype_session_service),
) -> PrototypeSessionCreateResponse:
    """Create one persisted session for the Figma-aligned role/chat prototype flow."""
    return prototype_session_service.create_session(request)


@router.put("/sessions/{session_id}/state", response_model=PrototypeSessionStateResponse)
def sync_prototype_session_state(
    session_id: str,
    request: PrototypeSessionStateSyncRequest,
    prototype_session_service: PrototypeSessionService = Depends(get_prototype_session_service),
) -> PrototypeSessionStateResponse:
    """Persist the latest frontend runtime snapshot for the prototype experience."""
    try:
        return prototype_session_service.sync_state(session_id, request)
    except PrototypeSessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/sessions/{session_id}/state", response_model=PrototypeSessionStateResponse)
def get_prototype_session_state(
    session_id: str,
    prototype_session_service: PrototypeSessionService = Depends(get_prototype_session_service),
) -> PrototypeSessionStateResponse:
    """Return the last stored state snapshot for the prototype UI."""
    try:
        return prototype_session_service.get_state(session_id)
    except PrototypeSessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
