from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class ScoreEvidence(BaseModel):
    """One observed behavior that contributed to a dimension score."""

    evidence_id: str
    dimension_id: str
    signal_id: str
    source: str
    source_id: str | None = None
    points: int
    excerpt: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class DimensionScore(BaseModel):
    """Deterministic score for one research dimension."""

    dimension_id: str
    label: str
    score: int
    status: Literal["not_observed", "available", "observed"]
    opportunity_count: int
    evidence: list[ScoreEvidence] = Field(default_factory=list)


class DeterministicScoringResult(BaseModel):
    """Rubric-based result before secondary/fallback LLM review."""

    scores: dict[str, DimensionScore]
    unclassified_event_ids: list[str] = Field(default_factory=list)
    rubric_version: str
    scored_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class LLMGradeReview(BaseModel):
    """Secondary/fallback LLM evaluator output and parser status."""

    status: Literal["disabled", "completed", "failed"]
    provider: str
    prompt_version: str
    model: str | None = None
    parsed: dict[str, Any] | None = None
    raw_response: str | None = None
    error: str | None = None


class EpisodeScoringResponse(BaseModel):
    """Final score payload returned to researchers."""

    session_id: str
    episode_id: str
    deterministic: DeterministicScoringResult
    llm_review: LLMGradeReview
