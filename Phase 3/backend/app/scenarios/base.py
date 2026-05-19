from __future__ import annotations

from typing import Any, Protocol

from app.schemas.episode import EpisodeDefinition
from app.schemas.scoring import DeterministicScoringResult
from app.schemas.session import SessionEvent


class ScenarioClassification(Protocol):
    """Common shape for scenario-owned semantic classifications."""

    choice: str
    subchoice: str | None
    terminal: bool
    matched_signals: tuple[str, ...]

    def metadata(self) -> dict[str, Any]:
        """Return event metadata that can be stored with session events."""


class ScenarioModule(Protocol):
    """Scenario-specific extension point for classification, scoring, and nudges."""

    scenario_id: str
    classifier_template_name: str | None
    llm_classifier_version: str
    fallback_classifier_version: str
    # Optional per-scenario confidence floor for the LLM classifier. When unset,
    # the LLMSemanticClassifier uses its global default (settings.llm_classifier_min_confidence).
    # Scenarios with many close-together labels (e.g. SCN-3-APR with 14+ choices)
    # should raise this to avoid confidently-wrong category picks.
    min_confidence: float

    def classify_message(self, message: str) -> ScenarioClassification | None:
        """Classify participant wording with scenario-owned deterministic rules."""

    def classification_from_metadata(
        self, metadata: dict[str, Any]
    ) -> ScenarioClassification | None:
        """Recover a classification already stored on an event."""

    def classification_from_llm_payload(
        self, payload: Any
    ) -> ScenarioClassification | None:
        """Convert a validated LLM payload into this scenario's classification type."""

    def score(self, events: list[SessionEvent]) -> DeterministicScoringResult | None:
        """Return deterministic scoring for the scenario, or None to use generic scoring."""

    def progression_signal_met(
        self,
        *,
        signal: str,
        record: Any,
        episode: EpisodeDefinition,
    ) -> bool | None:
        """Return a scenario-specific progression decision, or None for generic logic."""

    def fallback_reply(
        self, classification: ScenarioClassification
    ) -> str | None:
        """Return a scenario-specific offline assistant reply for a classified message."""
