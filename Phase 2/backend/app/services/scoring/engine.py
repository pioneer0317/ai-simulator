from __future__ import annotations

from collections.abc import Mapping
from pathlib import Path
from typing import Any

import yaml

from app.schemas.scoring import (
    DimensionScore,
    DimensionScoringResult,
    ScoreEvidence,
    ScoringMetadata,
    UnclassifiedBehavior,
)


class DimensionScoringService:
    """Apply the editable Phase 2 scoring rubric to a prototype session snapshot."""

    def __init__(self, rubric_path: Path) -> None:
        self._rubric_path = Path(rubric_path)
        self._rubric = self._load_rubric()

    def score_snapshot(self, snapshot: Mapping[str, Any]) -> DimensionScoringResult:
        """Score captured user behavior using deterministic rubric signals."""
        messages = self._as_list(snapshot.get("messages"))
        data_snapshot = self._as_dict(snapshot.get("data_snapshot"))
        actions = self._as_list(data_snapshot.get("userActions"))
        timeline_events = self._as_list(data_snapshot.get("eventTimeline"))

        scores: dict[str, DimensionScore] = {}
        classified_message_ids: set[str] = set()
        for dimension_id, config in self._rubric.get("dimensions", {}).items():
            evidence = self._collect_evidence(
                dimension_id=dimension_id,
                config=self._as_dict(config),
                messages=messages,
                actions=actions,
                timeline_events=timeline_events,
                data_snapshot=data_snapshot,
            )
            classified_message_ids.update(
                item.source_id
                for item in evidence
                if item.source == "message" and item.source_id is not None
            )
            opportunities = self._count_opportunities(
                config=self._as_dict(config),
                messages=messages,
                actions=actions,
                timeline_events=timeline_events,
                data_snapshot=data_snapshot,
                evidence=evidence,
            )
            scores[dimension_id] = self._build_dimension_score(
                dimension_id=dimension_id,
                config=self._as_dict(config),
                evidence=evidence,
                opportunities=opportunities,
            )

        return DimensionScoringResult(
            scores=scores,
            unclassified_behaviors=self._collect_unclassified_messages(
                messages=messages,
                classified_message_ids=classified_message_ids,
            ),
            metadata=self._build_metadata(),
        )

    def _load_rubric(self) -> dict[str, Any]:
        """Load and validate the rubric document once at application startup."""
        if not self._rubric_path.exists():
            raise FileNotFoundError(f"Scoring rubric was not found: {self._rubric_path}")
        with self._rubric_path.open("r", encoding="utf-8") as rubric_file:
            payload = yaml.safe_load(rubric_file) or {}
        if not isinstance(payload, dict) or not payload.get("dimensions"):
            raise ValueError("Scoring rubric must define a non-empty dimensions mapping.")
        return payload

    def _collect_evidence(
        self,
        *,
        dimension_id: str,
        config: Mapping[str, Any],
        messages: list[dict[str, Any]],
        actions: list[dict[str, Any]],
        timeline_events: list[dict[str, Any]],
        data_snapshot: Mapping[str, Any],
    ) -> list[ScoreEvidence]:
        """Collect all action, message, timeline, and flag signals for one dimension."""
        evidence: list[ScoreEvidence] = []
        for signal in self._as_list(config.get("signals")):
            signal_config = self._as_dict(signal)
            source = str(signal_config.get("source", ""))
            if source == "message":
                evidence.extend(
                    self._message_evidence(dimension_id, signal_config, messages)
                )
            elif source == "action":
                evidence.extend(
                    self._action_evidence(dimension_id, signal_config, actions)
                )
            elif source == "timeline":
                evidence.extend(
                    self._timeline_evidence(dimension_id, signal_config, timeline_events)
                )
            elif source == "flag":
                flag_evidence = self._flag_evidence(
                    dimension_id,
                    signal_config,
                    data_snapshot,
                )
                if flag_evidence is not None:
                    evidence.append(flag_evidence)
        return evidence

    def _message_evidence(
        self,
        dimension_id: str,
        signal: Mapping[str, Any],
        messages: list[dict[str, Any]],
    ) -> list[ScoreEvidence]:
        """Match user messages against rubric keyword signals."""
        keywords = [str(keyword).lower() for keyword in self._as_list(signal.get("keywords"))]
        if not keywords:
            return []

        evidence: list[ScoreEvidence] = []
        for index, message in enumerate(messages):
            if message.get("sender") != "user":
                continue
            content = str(message.get("content", ""))
            lowered = content.lower()
            matched_keywords = [keyword for keyword in keywords if keyword in lowered]
            if not matched_keywords:
                continue
            evidence.append(
                self._build_evidence(
                    dimension_id=dimension_id,
                    signal=signal,
                    source="message",
                    source_id=str(message.get("id") or f"message-{index}"),
                    excerpt=self._excerpt(content),
                    metadata={"matched_keywords": matched_keywords},
                )
            )
        return evidence

    def _action_evidence(
        self,
        dimension_id: str,
        signal: Mapping[str, Any],
        actions: list[dict[str, Any]],
    ) -> list[ScoreEvidence]:
        """Match structured frontend user actions against rubric fields."""
        match = self._as_dict(signal.get("match"))
        if not match:
            return []

        evidence: list[ScoreEvidence] = []
        for index, action in enumerate(actions):
            if not self._matches(action, match):
                continue
            evidence.append(
                self._build_evidence(
                    dimension_id=dimension_id,
                    signal=signal,
                    source="action",
                    source_id=str(action.get("id") or f"action-{index}"),
                    excerpt=str(action.get("type") or action.get("category") or ""),
                    metadata={"matched_fields": match},
                )
            )
        return evidence

    def _timeline_evidence(
        self,
        dimension_id: str,
        signal: Mapping[str, Any],
        timeline_events: list[dict[str, Any]],
    ) -> list[ScoreEvidence]:
        """Match timeline event types against rubric signals."""
        event_types = set(self._as_list(signal.get("event_types")))
        if not event_types:
            return []

        evidence: list[ScoreEvidence] = []
        for index, event in enumerate(timeline_events):
            if event.get("eventType") not in event_types:
                continue
            evidence.append(
                self._build_evidence(
                    dimension_id=dimension_id,
                    signal=signal,
                    source="timeline",
                    source_id=str(event.get("id") or f"timeline-{index}"),
                    excerpt=str(event.get("description") or event.get("eventType") or ""),
                    metadata={"event_type": event.get("eventType")},
                )
            )
        return evidence

    def _flag_evidence(
        self,
        dimension_id: str,
        signal: Mapping[str, Any],
        data_snapshot: Mapping[str, Any],
    ) -> ScoreEvidence | None:
        """Match aggregate frontend flags such as hallucinationsCaught."""
        path = signal.get("path")
        if not path:
            return None
        value = self._get_path(data_snapshot, str(path))
        min_value = signal.get("min_value")
        equals = signal.get("equals")

        if min_value is not None:
            try:
                if float(value or 0) < float(min_value):
                    return None
            except (TypeError, ValueError):
                return None
        elif equals is not None and value != equals:
            return None
        elif min_value is None and equals is None and not value:
            return None

        return self._build_evidence(
            dimension_id=dimension_id,
            signal=signal,
            source="flag",
            source_id=str(path),
            excerpt=f"{path}={value}",
            metadata={"path": str(path), "value": value},
        )

    def _count_opportunities(
        self,
        *,
        config: Mapping[str, Any],
        messages: list[dict[str, Any]],
        actions: list[dict[str, Any]],
        timeline_events: list[dict[str, Any]],
        data_snapshot: Mapping[str, Any],
        evidence: list[ScoreEvidence],
    ) -> int:
        """Count moments where the dimension could reasonably be observed."""
        rules = self._as_dict(config.get("opportunity_rules"))
        opportunities = 0

        for flag in self._as_list(rules.get("message_flags")):
            opportunities += sum(1 for message in messages if message.get(str(flag)) is True)

        for match in self._as_list(rules.get("action_matches")):
            match_dict = self._as_dict(match)
            opportunities += sum(1 for action in actions if self._matches(action, match_dict))

        event_types = set(self._as_list(rules.get("timeline_event_types")))
        if event_types:
            opportunities += sum(
                1 for event in timeline_events if event.get("eventType") in event_types
            )

        agent_modes = set(self._as_list(rules.get("agent_modes")))
        if data_snapshot.get("agentMode") in agent_modes:
            opportunities += 1

        if opportunities == 0 and evidence:
            return 1
        return opportunities

    def _build_dimension_score(
        self,
        *,
        dimension_id: str,
        config: Mapping[str, Any],
        evidence: list[ScoreEvidence],
        opportunities: int,
    ) -> DimensionScore:
        """Calculate the bounded 0-100 score for one dimension."""
        scale = self._as_dict(self._rubric.get("score_scale"))
        minimum = int(scale.get("min", 0))
        maximum = int(scale.get("max", 100))
        base_score = int(config.get("base_score", scale.get("default_base", 50)))
        positive_points = sum(item.points for item in evidence if item.points > 0)
        negative_points = sum(item.points for item in evidence if item.points < 0)

        if opportunities <= 0:
            return DimensionScore(
                dimension_id=dimension_id,
                label=str(config.get("label", dimension_id)),
                description=str(config.get("description", "")),
                status="not_measured",
                confidence="needs_review",
                score=None,
                base_score=base_score,
                opportunities=0,
                signal_count=0,
                evidence=[],
            )

        score = max(minimum, min(maximum, base_score + positive_points + negative_points))
        return DimensionScore(
            dimension_id=dimension_id,
            label=str(config.get("label", dimension_id)),
            description=str(config.get("description", "")),
            status="measured",
            confidence=self._confidence(len(evidence), opportunities),
            score=score,
            base_score=base_score,
            positive_points=positive_points,
            negative_points=negative_points,
            opportunities=opportunities,
            signal_count=len(evidence),
            evidence=evidence,
        )

    def _build_metadata(self) -> ScoringMetadata:
        """Build provenance metadata for downstream analytics exports."""
        scale = self._as_dict(self._rubric.get("score_scale"))
        llm_config = self._as_dict(self._rubric.get("llm_classifier"))
        return ScoringMetadata(
            rubric_version=str(self._rubric.get("version", "unknown")),
            score_scale={
                "min": int(scale.get("min", 0)),
                "max": int(scale.get("max", 100)),
            },
            primary_dimensions=list(self._rubric.get("dimensions", {}).keys()),
            llm_classifier_enabled=bool(llm_config.get("enabled", False)),
            llm_classifier_status=str(llm_config.get("status", "not_configured")),
            notes=[
                "Placeholder rubric: review weights and keywords before production study use.",
                "LLM classification is intentionally disabled until the team approves prompts and QA.",
            ],
        )

    def _collect_unclassified_messages(
        self,
        *,
        messages: list[dict[str, Any]],
        classified_message_ids: set[str],
    ) -> list[UnclassifiedBehavior]:
        """Preserve unmatched user messages for later rubric refinement."""
        unclassified: list[UnclassifiedBehavior] = []
        for index, message in enumerate(messages):
            if message.get("sender") != "user":
                continue
            message_id = str(message.get("id") or f"message-{index}")
            content = str(message.get("content", "")).strip()
            if not content or message_id in classified_message_ids:
                continue
            unclassified.append(
                UnclassifiedBehavior(
                    source="message",
                    source_id=message_id,
                    raw_text=self._excerpt(content, limit=220),
                    reason="No active placeholder rubric signal matched this user message.",
                )
            )
        return unclassified[:10]

    @staticmethod
    def _build_evidence(
        *,
        dimension_id: str,
        signal: Mapping[str, Any],
        source: str,
        source_id: str | None,
        excerpt: str | None,
        metadata: dict[str, Any],
    ) -> ScoreEvidence:
        """Create one evidence object with consistent identifiers and polarity."""
        points = int(signal.get("points", 0))
        signal_id = str(signal.get("id", "unknown_signal"))
        polarity = "positive" if points > 0 else "negative" if points < 0 else "neutral"
        return ScoreEvidence(
            evidence_id=f"{dimension_id}:{signal_id}:{source_id or 'unknown'}",
            dimension_id=dimension_id,
            signal_id=signal_id,
            label=str(signal.get("label", signal_id)),
            source=source,  # type: ignore[arg-type]
            source_id=source_id,
            excerpt=excerpt,
            points=points,
            polarity=polarity,  # type: ignore[arg-type]
            metadata=metadata,
        )

    @staticmethod
    def _matches(payload: Mapping[str, Any], expected_fields: Mapping[str, Any]) -> bool:
        """Return true when every expected field equals the observed payload value."""
        return all(
            payload.get(field_name) == expected_value
            for field_name, expected_value in expected_fields.items()
        )

    @staticmethod
    def _get_path(payload: Mapping[str, Any], path: str) -> Any:
        """Read a dotted path from a nested dictionary."""
        current: Any = payload
        for segment in path.split("."):
            if not isinstance(current, Mapping):
                return None
            current = current.get(segment)
        return current

    @staticmethod
    def _confidence(signal_count: int, opportunities: int) -> str:
        """Derive a simple confidence band from observed signal density."""
        if signal_count >= 3:
            return "high"
        if signal_count >= 1:
            return "medium"
        if opportunities > 0:
            return "low"
        return "needs_review"

    @staticmethod
    def _excerpt(value: str, *, limit: int = 160) -> str:
        """Return a compact text excerpt suitable for analytics display."""
        normalized = " ".join(value.split())
        return normalized if len(normalized) <= limit else f"{normalized[: limit - 3]}..."

    @staticmethod
    def _as_dict(value: Any) -> dict[str, Any]:
        """Coerce unknown JSON/YAML values into a dictionary."""
        return dict(value) if isinstance(value, Mapping) else {}

    @staticmethod
    def _as_list(value: Any) -> list[Any]:
        """Coerce unknown JSON/YAML values into a list."""
        return list(value) if isinstance(value, list) else []
