from __future__ import annotations

from pydantic import BaseModel, Field


class AdvisorDefinition(BaseModel):
    advisor_id: str
    display_name: str
    role: str
    source_summary: str
    source_materials: list[str] = Field(default_factory=list)
    system_prompt: str


class AdvisorOutput(BaseModel):
    advisor_id: str
    display_name: str
    role: str
    recommendation: str
    rationale: str
    confidence: float
    source_materials: list[str] = Field(default_factory=list)
