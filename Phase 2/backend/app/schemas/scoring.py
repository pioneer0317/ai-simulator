from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


ScoreStatus = Literal["measured", "not_measured"]
ScoreConfidence = Literal["high", "medium", "low", "needs_review"]
EvidenceSource = Literal["message", "action", "timeline", "flag"]
EvidencePolarity = Literal["positive", "negative", "neutral"]


class ScoreEvidence(BaseModel):
    """One classified behavior signal used by the deterministic rubric."""

    evidence_id: str
    dimension_id: str
    signal_id: str
    label: str
    source: EvidenceSource
    points: int
    polarity: EvidencePolarity
    source_id: str | None = None
    excerpt: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class DimensionScore(BaseModel):
    """Score summary for one research dimension."""

    dimension_id: str
    label: str
    description: str
    status: ScoreStatus
    confidence: ScoreConfidence
    score: int | None = None
    base_score: int
    positive_points: int = 0
    negative_points: int = 0
    opportunities: int = 0
    signal_count: int = 0
    evidence: list[ScoreEvidence] = Field(default_factory=list)


class UnclassifiedBehavior(BaseModel):
    """Behavior captured by the prototype that did not match the active rubric."""

    source: Literal["message", "action", "timeline"]
    source_id: str | None = None
    raw_text: str
    reason: str
    possible_dimensions: list[str] = Field(default_factory=list)
    confidence: ScoreConfidence = "needs_review"


class ScoringMetadata(BaseModel):
    """Version and provenance information for a scoring pass."""

    rubric_version: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    score_scale: dict[str, int] = Field(default_factory=dict)
    primary_dimensions: list[str] = Field(default_factory=list)
    llm_classifier_enabled: bool = False
    llm_classifier_status: str = "not_configured"
    notes: list[str] = Field(default_factory=list)


class DimensionScoringResult(BaseModel):
    """Full scoring result returned with prototype session state."""

    scores: dict[str, DimensionScore] = Field(default_factory=dict)
    unclassified_behaviors: list[UnclassifiedBehavior] = Field(default_factory=list)
    metadata: ScoringMetadata
