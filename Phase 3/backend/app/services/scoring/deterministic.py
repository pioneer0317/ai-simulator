from __future__ import annotations

from pathlib import Path
from typing import Any, Mapping

import yaml

from app.scenarios.scenario_1 import (
    DIMENSION_ID as SCENARIO1_DIMENSION_ID,
    DIMENSION_LABEL as SCENARIO1_DIMENSION_LABEL,
    SCENARIO_ID as SCENARIO1_ID,
    SCORING_RUBRIC_VERSION as SCENARIO1_RUBRIC_VERSION,
    SOURCE_ARTIFACT_IDS as SCENARIO1_SOURCE_ARTIFACT_IDS,
    classification_from_metadata as scenario1_classification_from_metadata,
    score_profile as scenario1_score_profile,
)
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
        if episode.episode_id == SCENARIO1_ID:
            return self._score_scenario1_uncertainty(events)

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

    def _score_scenario1_uncertainty(
        self,
        events: list[SessionEvent],
    ) -> DeterministicScoringResult:
        """Apply the finalized Scenario 1 uncertainty-recognition scoring model."""
        evidence: list[ScoreEvidence] = []
        classified_event_ids: set[str] = set()

        classified_events = [
            (index, event, scenario1_classification_from_metadata(event.metadata))
            for index, event in enumerate(events)
        ]
        classified_events = [
            (index, event, classification)
            for index, event, classification in classified_events
            if classification is not None
        ]
        first_terminal = next(
            (
                (index, event, classification)
                for index, event, classification in classified_events
                if classification.terminal
            ),
            None,
        )
        terminal_index = first_terminal[0] if first_terminal is not None else len(events)
        prior_events = events[: terminal_index + 1]

        source_opens = [
            event
            for event in prior_events
            if event.event_type == "artifact_opened"
            and event.artifact_id in SCENARIO1_SOURCE_ARTIFACT_IDS
        ]
        opened_source_ids = {event.artifact_id for event in source_opens if event.artifact_id}
        if len(opened_source_ids) >= 2:
            self._scenario1_add_evidence(
                evidence,
                "opened_both_source_files",
                8,
                source_opens[-1],
                "Opened both Scenario 1 source files before sending.",
                {"opened_artifact_ids": sorted(opened_source_ids)},
            )
            classified_event_ids.update(event.event_id for event in source_opens)
        elif len(opened_source_ids) == 1:
            self._scenario1_add_evidence(
                evidence,
                "opened_one_source_file",
                5,
                source_opens[0],
                "Opened one Scenario 1 source file before sending.",
                {"opened_artifact_ids": sorted(opened_source_ids)},
            )
            classified_event_ids.add(source_opens[0].event_id)

        warning_event = self._first_participant_message_matching(
            prior_events,
            required_any=("vendor", "contractor", "nexus", "marcus"),
            signal_any=("not final", "unconfirmed", "not confirmed", "placeholder", "old estimate"),
        )
        if warning_event is not None:
            self._scenario1_add_evidence(
                evidence,
                "noticed_source_warning_flags",
                5,
                warning_event,
                self._excerpt(warning_event.content or ""),
                {"behavior": "noticed source-file warning flags"},
            )
            classified_event_ids.add(warning_event.event_id)

        hedge_event = self._first_participant_message_matching(
            prior_events,
            required_any=("may shift", "number may shift", "shift once marcus"),
            signal_any=None,
        )
        if hedge_event is not None:
            self._scenario1_add_evidence(
                evidence,
                "read_full_agent_response_before_replying",
                3,
                hedge_event,
                self._excerpt(hedge_event.content or ""),
                {"behavior": "referenced the embedded hedge"},
            )
            classified_event_ids.add(hedge_event.event_id)

        follow_up_event = self._first_follow_up_before_terminal(prior_events, terminal_index)
        if follow_up_event is not None:
            self._scenario1_add_evidence(
                evidence,
                "asked_follow_up_question_before_acting",
                5,
                follow_up_event,
                self._excerpt(follow_up_event.content or ""),
                {"behavior": "asked a follow-up question before acting"},
            )
            classified_event_ids.add(follow_up_event.event_id)

        saw_choice_c = False
        saw_vendor_identification = False
        first_terminal_choice = first_terminal[2] if first_terminal is not None else None
        for _, event, classification in classified_events:
            classified_event_ids.add(event.event_id)
            if classification.choice == "C":
                if not saw_choice_c:
                    self._scenario1_add_evidence(
                        evidence,
                        "clarified_vendor_number_uncertainty",
                        15,
                        event,
                        self._excerpt(event.content or ""),
                        classification.metadata(),
                    )
                    saw_choice_c = True
                if not saw_vendor_identification:
                    self._scenario1_add_evidence(
                        evidence,
                        "identified_vendor_services_as_key_gap",
                        10,
                        event,
                        self._excerpt(event.content or ""),
                        classification.metadata(),
                    )
                    saw_vendor_identification = True
                if classification.subchoice == "i":
                    self._scenario1_add_evidence(
                        evidence,
                        "held_send_and_contacted_marcus",
                        12,
                        event,
                        self._excerpt(event.content or ""),
                        classification.metadata(),
                    )
                elif classification.subchoice == "ii":
                    self._scenario1_add_evidence(
                        evidence,
                        "sent_with_vendor_tbc_caveat",
                        10,
                        event,
                        self._excerpt(event.content or ""),
                        classification.metadata(),
                    )
                elif classification.subchoice == "iii":
                    self._scenario1_add_evidence(
                        evidence,
                        "caught_uncertainty_but_sent_anyway",
                        -7,
                        event,
                        self._excerpt(event.content or ""),
                        classification.metadata(),
                    )

        if first_terminal is not None:
            _, event, classification = first_terminal
            if not opened_source_ids:
                self._scenario1_add_evidence(
                    evidence,
                    "sent_without_opening_source_file",
                    -8,
                    event,
                    self._excerpt(event.content or ""),
                    classification.metadata(),
                )
            if follow_up_event is None and classification.choice in {"A", "B", "D"}:
                self._scenario1_add_evidence(
                    evidence,
                    "sent_without_follow_up_question",
                    -5,
                    event,
                    self._excerpt(event.content or ""),
                    classification.metadata(),
                )
            if classification.choice == "A":
                self._scenario1_add_evidence(
                    evidence,
                    "sent_as_is_no_caveat_no_followup",
                    -10,
                    event,
                    self._excerpt(event.content or ""),
                    classification.metadata(),
                )
            elif classification.choice == "B":
                self._scenario1_add_evidence(
                    evidence,
                    "flagged_software_instead_of_vendor",
                    -5,
                    event,
                    self._excerpt(event.content or ""),
                    classification.metadata(),
                )
            elif classification.choice == "D":
                self._scenario1_add_evidence(
                    evidence,
                    "cced_marcus_without_resolution",
                    -3,
                    event,
                    self._excerpt(event.content or ""),
                    classification.metadata(),
                )

        score = max(0, min(100, 50 + sum(item.points for item in evidence)))
        profile = scenario1_score_profile(score)
        score_evidence = list(evidence)
        if first_terminal_choice is not None:
            score_evidence.append(
                ScoreEvidence(
                    evidence_id=f"{SCENARIO1_DIMENSION_ID}:behavioral_profile:profile",
                    dimension_id=SCENARIO1_DIMENSION_ID,
                    signal_id="behavioral_profile",
                    source="score_summary",
                    source_id=None,
                    points=0,
                    excerpt=profile,
                    metadata={
                        "profile": profile,
                        "choice": first_terminal_choice.choice,
                        "subchoice": first_terminal_choice.subchoice,
                    },
                )
            )

        dimension = DimensionScore(
            dimension_id=SCENARIO1_DIMENSION_ID,
            label=SCENARIO1_DIMENSION_LABEL,
            score=score,
            status="observed" if evidence else "available",
            opportunity_count=1,
            evidence=score_evidence,
        )
        unclassified_event_ids = [
            event.event_id
            for event in events
            if event.actor == "participant"
            and event.event_type in {"user_message", "decision_submitted", "final_response"}
            and event.event_id not in classified_event_ids
        ]
        return DeterministicScoringResult(
            scores={SCENARIO1_DIMENSION_ID: dimension},
            unclassified_event_ids=unclassified_event_ids,
            rubric_version=SCENARIO1_RUBRIC_VERSION,
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
    def _scenario1_add_evidence(
        evidence: list[ScoreEvidence],
        signal_id: str,
        points: int,
        event: SessionEvent,
        excerpt: str,
        metadata: dict[str, Any],
    ) -> None:
        evidence.append(
            ScoreEvidence(
                evidence_id=f"{SCENARIO1_DIMENSION_ID}:{signal_id}:{event.event_id}",
                dimension_id=SCENARIO1_DIMENSION_ID,
                signal_id=signal_id,
                source=event.event_type,
                source_id=event.event_id,
                points=points,
                excerpt=excerpt,
                metadata=metadata,
            )
        )

    @staticmethod
    def _first_participant_message_matching(
        events: list[SessionEvent],
        *,
        required_any: tuple[str, ...],
        signal_any: tuple[str, ...] | None,
    ) -> SessionEvent | None:
        for event in events:
            if event.actor != "participant" or event.event_type not in {
                "user_message",
                "decision_submitted",
                "final_response",
                "scenario_completed",
            }:
                continue
            text = (event.content or "").lower()
            if not any(term in text for term in required_any):
                continue
            if signal_any is not None and not any(term in text for term in signal_any):
                continue
            return event
        return None

    @staticmethod
    def _first_follow_up_before_terminal(
        events: list[SessionEvent],
        terminal_index: int,
    ) -> SessionEvent | None:
        follow_up_starts = (
            "what",
            "why",
            "how",
            "can you",
            "could you",
            "explain",
            "clarify",
            "walk me through",
            "tell me",
        )
        for index, event in enumerate(events):
            if index >= terminal_index:
                break
            if event.actor != "participant" or event.event_type != "user_message":
                continue
            text = " ".join((event.content or "").lower().split())
            if "?" in text or text.startswith(follow_up_starts):
                return event
        return None

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
