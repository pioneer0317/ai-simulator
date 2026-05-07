from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


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


class LLMGradeDimensionReview(BaseModel):
    """Validated LLM review for one deterministic rubric dimension."""

    model_config = ConfigDict(extra="forbid")

    score: int = Field(ge=0, le=100)
    level: int = Field(ge=0, le=4)
    rationale: str = Field(min_length=1)
    evidence_event_ids: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)


class LLMGradeFlag(BaseModel):
    """Validated LLM flag for behavior the deterministic layer may have missed."""

    model_config = ConfigDict(extra="forbid")

    type: str = Field(min_length=1)
    description: str = Field(min_length=1)
    event_ids: list[str] = Field(default_factory=list)


class LLMSuggestedRubricUpdate(BaseModel):
    """Validated LLM suggestion for improving deterministic rubric signals."""

    model_config = ConfigDict(extra="forbid")

    dimension_id: str = Field(min_length=1)
    reason: str = Field(min_length=1)
    suggested_signal: str = Field(min_length=1)


class LLMGraderParsedReview(BaseModel):
    """Strict JSON shape accepted from the secondary LLM grader."""

    model_config = ConfigDict(extra="forbid")

    dimension_reviews: dict[str, LLMGradeDimensionReview]
    flags: list[LLMGradeFlag] = Field(default_factory=list)
    suggested_rubric_updates: list[LLMSuggestedRubricUpdate] = Field(default_factory=list)


class LLMGradeReview(BaseModel):
    """Secondary/fallback LLM evaluator output and parser status."""

    status: Literal["disabled", "completed", "failed"]
    provider: str
    prompt_version: str
    model: str | None = None
    parsed: LLMGraderParsedReview | None = None
    raw_response: str | None = None
    error: str | None = None


class EpisodeScoringResponse(BaseModel):
    """Final score payload returned to researchers."""

    session_id: str
    episode_id: str
    deterministic: DeterministicScoringResult
    llm_review: LLMGradeReview
