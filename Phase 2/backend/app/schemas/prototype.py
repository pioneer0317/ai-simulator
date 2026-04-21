from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class PrototypeSessionCreateRequest(BaseModel):
    """Create a backend session for the Figma-aligned prototype role/chat flow."""

    professional_role: str
    simulation_mode: Literal["training", "testing"] = "testing"
    metadata: dict[str, Any] = Field(default_factory=dict)


class PrototypeSessionCreateResponse(BaseModel):
    """Return the persisted identifiers needed by the prototype frontend."""

    session_id: str
    scenario_id: str
    status: str
    professional_role: str
    simulation_mode: str


class PrototypeChatMessage(BaseModel):
    """Serializable chat message snapshot synced from the prototype frontend."""

    id: str
    sender: Literal["agent", "user"]
    content: str
    timestamp: datetime
    isHallucination: bool | None = None
    isDrift: bool | None = None
    isVague: bool | None = None


class PrototypeSessionStateSyncRequest(BaseModel):
    """Snapshot of the prototype runtime that should be persisted on the backend."""

    current_route: str
    professional_role: str
    task_completed: bool = False
    conversation_turn: int = 0
    show_context_dashboard: bool = False
    messages: list[PrototypeChatMessage] = Field(default_factory=list)
    data_snapshot: dict[str, Any] = Field(default_factory=dict)


class PrototypeSessionStateResponse(BaseModel):
    """Return the latest stored snapshot for a prototype-backed session."""

    session_id: str
    scenario_id: str
    status: str
    current_route: str
    professional_role: str
    simulation_mode: str
    conversation_turn: int = 0
    show_context_dashboard: bool = False
    current_step_id: str | None = None
    synced_at: datetime | None = None
    completed_at: datetime | None = None
    snapshot: dict[str, Any] = Field(default_factory=dict)
