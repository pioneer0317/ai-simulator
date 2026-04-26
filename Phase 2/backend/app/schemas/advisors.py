from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class AdvisorDefinition(BaseModel):
    """Static advisor identity and grounding loaded from YAML."""

    advisor_id: str
    display_name: str
    role: str
    source_summary: str
    source_materials: list[str] = Field(default_factory=list)
    system_prompt: str


class AdvisorOutput(BaseModel):
    """Advisor output returned to the frontend for one scenario step."""

    advisor_id: str
    display_name: str
    role: str
    recommendation: str
    rationale: str
    confidence: float
    source_materials: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
