from __future__ import annotations

from pathlib import Path
from typing import Any, Mapping

import yaml

from app.schemas.episode import EpisodeDefinition
from app.schemas.scoring import DeterministicScoringResult, DimensionScore, ScoreEvidence
from app.schemas.session import SessionEvent


class DeterministicScorer:
    """Apply editable keyword/action/artifact signals before any LLM review."""

    def __init__(self, rubric_path: Path) -> None:
        self._rubric_path = Path(rubric_path)
        self._rubric = self._load_rubric()

    @property
    def rubric(self) -> dict[str, Any]:
        """Expose the active rubric for the LLM grader prompt payload."""
        return self._rubric

    def score(
        self,
        *,
        episode: EpisodeDefinition,
        events: list[SessionEvent],
    ) -> DeterministicScoringResult:
        """Score a session transcript using deterministic rubric signals."""
        scores: dict[str, DimensionScore] = {}
        classified_event_ids: set[str] = set()

        for dimension_id, config in self._rubric.get("dimensions", {}).items():
            config_map = self._as_dict(config)
            evidence = self._collect_evidence(
                dimension_id=dimension_id,
                config=config_map,
                episode=episode,
                events=events,
            )
            classified_event_ids.update(
                item.source_id for item in evidence if item.source_id is not None
            )
            opportunity_count = self._count_opportunities(
                dimension_id=dimension_id,
                config=config_map,
                episode=episode,
                events=events,
            )
            scores[dimension_id] = self._dimension_score(
                dimension_id=dimension_id,
                config=config_map,
                evidence=evidence,
                opportunity_count=opportunity_count,
            )

        unclassified_event_ids = [
            event.event_id
            for event in events
            if event.actor == "participant"
            and event.event_type in {"user_message", "decision_submitted", "final_response"}
            and event.event_id not in classified_event_ids
        ]

        return DeterministicScoringResult(
            scores=scores,
            unclassified_event_ids=unclassified_event_ids,
            rubric_version=str(self._rubric.get("version", "unknown")),
        )

    def _load_rubric(self) -> dict[str, Any]:
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
        episode: EpisodeDefinition,
        events: list[SessionEvent],
    ) -> list[ScoreEvidence]:
        evidence: list[ScoreEvidence] = []
        artifact_map = {artifact.artifact_id: artifact for artifact in episode.artifacts}

        for signal in self._as_list(config.get("signals")):
            signal_map = self._as_dict(signal)
            source = str(signal_map.get("source", ""))
            if source == "message":
                evidence.extend(
                    self._message_evidence(dimension_id, signal_map, events)
                )
            elif source == "event":
                evidence.extend(self._event_evidence(dimension_id, signal_map, events))
            elif source == "artifact":
                evidence.extend(
                    self._artifact_evidence(dimension_id, signal_map, events, artifact_map)
                )

        return evidence

    def _message_evidence(
        self,
        dimension_id: str,
        signal: Mapping[str, Any],
        events: list[SessionEvent],
    ) -> list[ScoreEvidence]:
        keywords = [str(keyword).lower() for keyword in self._as_list(signal.get("keywords"))]
        if not keywords:
            return []

        event_types = set(
            self._as_list(
                signal.get(
                    "event_types",
                    ["user_message", "decision_submitted", "final_response"],
                )
            )
        )
        evidence: list[ScoreEvidence] = []
        for event in events:
            if event.actor != "participant" or event.event_type not in event_types:
                continue
            content = event.content or ""
            lowered = content.lower()
            matched = [keyword for keyword in keywords if keyword in lowered]
            if not matched:
                continue
            evidence.append(
                self._evidence(
                    dimension_id=dimension_id,
                    signal=signal,
                    source="message",
                    source_id=event.event_id,
                    excerpt=self._excerpt(content),
                    metadata={"matched_keywords": matched, "event_type": event.event_type},
                )
            )
        return evidence

    def _event_evidence(
        self,
        dimension_id: str,
        signal: Mapping[str, Any],
        events: list[SessionEvent],
    ) -> list[ScoreEvidence]:
        event_types = set(self._as_list(signal.get("event_types")))
        metadata_match = self._as_dict(signal.get("metadata_match"))
        evidence: list[ScoreEvidence] = []
        for event in events:
            if event_types and event.event_type not in event_types:
                continue
            if metadata_match and not self._matches(event.metadata, metadata_match):
                continue
            evidence.append(
                self._evidence(
                    dimension_id=dimension_id,
                    signal=signal,
                    source="event",
                    source_id=event.event_id,
                    excerpt=self._excerpt(event.content or event.event_type),
                    metadata={"event_type": event.event_type},
                )
            )
        return evidence

    def _artifact_evidence(
        self,
        dimension_id: str,
        signal: Mapping[str, Any],
        events: list[SessionEvent],
        artifact_map: Mapping[str, Any],
    ) -> list[ScoreEvidence]:
        required_tags = set(self._as_list(signal.get("artifact_tags")))
        required_kinds = set(self._as_list(signal.get("artifact_kinds")))
        evidence: list[ScoreEvidence] = []
        for event in events:
            if event.event_type != "artifact_opened" or event.artifact_id is None:
                continue
            artifact = artifact_map.get(event.artifact_id)
            if artifact is None:
                continue
            if required_tags and not required_tags.intersection(set(artifact.tags)):
                continue
            if required_kinds and artifact.kind not in required_kinds:
                continue
            evidence.append(
                self._evidence(
                    dimension_id=dimension_id,
                    signal=signal,
                    source="artifact",
                    source_id=event.event_id,
                    excerpt=f"Opened {artifact.title}",
                    metadata={
                        "artifact_id": artifact.artifact_id,
                        "artifact_tags": artifact.tags,
                        "artifact_kind": artifact.kind,
                    },
                )
            )
        return evidence

    def _count_opportunities(
        self,
        *,
        dimension_id: str,
        config: Mapping[str, Any],
        episode: EpisodeDefinition,
        events: list[SessionEvent],
    ) -> int:
        scoring_moments = sum(
            1 for moment in episode.scoring_moments if dimension_id in moment.dimension_ids
        )
        rules = self._as_dict(config.get("opportunity_rules"))
        event_types = set(self._as_list(rules.get("event_types")))
        event_opportunities = sum(1 for event in events if event.event_type in event_types)
        return max(scoring_moments, event_opportunities)

    def _dimension_score(
        self,
        *,
        dimension_id: str,
        config: Mapping[str, Any],
        evidence: list[ScoreEvidence],
        opportunity_count: int,
    ) -> DimensionScore:
        base_score = int(config.get("base_score", self._rubric.get("default_base_score", 50)))
        score = max(0, min(100, base_score + sum(item.points for item in evidence)))
        if evidence:
            status = "observed"
        elif opportunity_count:
            status = "available"
        else:
            status = "not_observed"
        return DimensionScore(
            dimension_id=dimension_id,
            label=str(config.get("label", dimension_id)),
            score=score,
            status=status,
            opportunity_count=opportunity_count,
            evidence=evidence,
        )

    @staticmethod
    def _evidence(
        *,
        dimension_id: str,
        signal: Mapping[str, Any],
        source: str,
        source_id: str | None,
        excerpt: str,
        metadata: dict[str, Any],
    ) -> ScoreEvidence:
        signal_id = str(signal.get("id", "unknown_signal"))
        return ScoreEvidence(
            evidence_id=f"{dimension_id}:{signal_id}:{source_id or source}",
            dimension_id=dimension_id,
            signal_id=signal_id,
            source=source,
            source_id=source_id,
            points=int(signal.get("points", 0)),
            excerpt=excerpt,
            metadata=metadata,
        )

    @staticmethod
    def _matches(payload: Mapping[str, Any], expected: Mapping[str, Any]) -> bool:
        for key, value in expected.items():
            if payload.get(key) != value:
                return False
        return True

    @staticmethod
    def _excerpt(text: str, limit: int = 220) -> str:
        normalized = " ".join(text.split())
        return normalized[:limit]

    @staticmethod
    def _as_list(value: Any) -> list[Any]:
        return value if isinstance(value, list) else []

    @staticmethod
    def _as_dict(value: Any) -> dict[str, Any]:
        return value if isinstance(value, dict) else {}
