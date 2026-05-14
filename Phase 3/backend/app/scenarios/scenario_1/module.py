from __future__ import annotations

from typing import Any

from app.scenarios.scenario_1.uncertainty import (
    DIMENSION_ID,
    DIMENSION_LABEL,
    SCENARIO_ID,
    SCORING_RUBRIC_VERSION,
    SOURCE_ARTIFACT_IDS,
    Scenario1Classification,
    classification_from_metadata,
    classify_message,
    score_profile,
)
from app.schemas.episode import EpisodeDefinition
from app.schemas.scoring import DeterministicScoringResult, DimensionScore, ScoreEvidence
from app.schemas.session import SessionEvent


class Scenario1Module:
    """Scenario 1 extension module for the finalized uncertainty-recognition case."""

    scenario_id = SCENARIO_ID
    classifier_template_name = "scenario1_semantic_classifier.md"
    llm_classifier_version = "scenario1-semantic-llm-v1"
    fallback_classifier_version = "scenario1-semantic-rules-fallback-v1"

    def classify_message(self, message: str) -> Scenario1Classification | None:
        return classify_message(message)

    def classification_from_metadata(
        self, metadata: dict[str, Any]
    ) -> Scenario1Classification | None:
        return classification_from_metadata(metadata)

    def classification_from_llm_payload(
        self, payload: Any
    ) -> Scenario1Classification | None:
        if not getattr(payload, "classified", False):
            return None
        choice = getattr(payload, "choice", None)
        label = getattr(payload, "label", None)
        if not isinstance(choice, str) or not isinstance(label, str):
            return None
        subchoice = getattr(payload, "subchoice", None) if choice == "C" else None
        matched_signals = getattr(payload, "matched_signals", [])
        return Scenario1Classification(
            choice=choice,
            subchoice=subchoice if isinstance(subchoice, str) else None,
            label=label,
            terminal=bool(getattr(payload, "terminal", False)),
            matched_signals=tuple(
                signal for signal in matched_signals if isinstance(signal, str)
            )
            if isinstance(matched_signals, list)
            else (),
        )

    def score(self, events: list[SessionEvent]) -> DeterministicScoringResult | None:
        evidence: list[ScoreEvidence] = []
        classified_event_ids: set[str] = set()

        classified_events = [
            (index, event, self._classification_for_event(event))
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
            and event.artifact_id in SOURCE_ARTIFACT_IDS
        ]
        opened_source_ids = {event.artifact_id for event in source_opens if event.artifact_id}
        if len(opened_source_ids) >= 2:
            self._add_evidence(
                evidence,
                "opened_both_source_files",
                8,
                source_opens[-1],
                "Opened both Scenario 1 source files before sending.",
                {"opened_artifact_ids": sorted(opened_source_ids)},
            )
            classified_event_ids.update(event.event_id for event in source_opens)
        elif len(opened_source_ids) == 1:
            self._add_evidence(
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
            self._add_evidence(
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
            self._add_evidence(
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
            self._add_evidence(
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
                    self._add_evidence(
                        evidence,
                        "clarified_vendor_number_uncertainty",
                        15,
                        event,
                        self._excerpt(event.content or ""),
                        classification.metadata(),
                    )
                    saw_choice_c = True
                if not saw_vendor_identification:
                    self._add_evidence(
                        evidence,
                        "identified_vendor_services_as_key_gap",
                        10,
                        event,
                        self._excerpt(event.content or ""),
                        classification.metadata(),
                    )
                    saw_vendor_identification = True
                if classification.subchoice == "i":
                    self._add_evidence(
                        evidence,
                        "held_send_and_contacted_marcus",
                        12,
                        event,
                        self._excerpt(event.content or ""),
                        classification.metadata(),
                    )
                elif classification.subchoice == "ii":
                    self._add_evidence(
                        evidence,
                        "sent_with_vendor_tbc_caveat",
                        10,
                        event,
                        self._excerpt(event.content or ""),
                        classification.metadata(),
                    )
                elif classification.subchoice == "iii":
                    self._add_evidence(
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
                self._add_evidence(
                    evidence,
                    "sent_without_opening_source_file",
                    -8,
                    event,
                    self._excerpt(event.content or ""),
                    classification.metadata(),
                )
            if follow_up_event is None and classification.choice in {"A", "B", "D"}:
                self._add_evidence(
                    evidence,
                    "sent_without_follow_up_question",
                    -5,
                    event,
                    self._excerpt(event.content or ""),
                    classification.metadata(),
                )
            if classification.choice == "A":
                self._add_evidence(
                    evidence,
                    "sent_as_is_no_caveat_no_followup",
                    -10,
                    event,
                    self._excerpt(event.content or ""),
                    classification.metadata(),
                )
            elif classification.choice == "B":
                self._add_evidence(
                    evidence,
                    "flagged_software_instead_of_vendor",
                    -5,
                    event,
                    self._excerpt(event.content or ""),
                    classification.metadata(),
                )
            elif classification.choice == "D":
                self._add_evidence(
                    evidence,
                    "cced_marcus_without_resolution",
                    -3,
                    event,
                    self._excerpt(event.content or ""),
                    classification.metadata(),
                )

        score = max(0, min(100, 50 + sum(item.points for item in evidence)))
        profile = score_profile(score)
        score_evidence = list(evidence)
        if first_terminal_choice is not None:
            score_evidence.append(
                ScoreEvidence(
                    evidence_id=f"{DIMENSION_ID}:behavioral_profile:profile",
                    dimension_id=DIMENSION_ID,
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
            dimension_id=DIMENSION_ID,
            label=DIMENSION_LABEL,
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
            scores={DIMENSION_ID: dimension},
            unclassified_event_ids=unclassified_event_ids,
            rubric_version=SCORING_RUBRIC_VERSION,
        )

    def progression_signal_met(
        self,
        *,
        signal: str,
        record: Any,
        episode: EpisodeDefinition,
    ) -> bool | None:
        if signal != "user_asked_for_comparison":
            return None

        if any(
            event.metadata.get("scenario1_choice") == "C"
            or "clarifies_vendor_uncertainty"
            in event.metadata.get("scenario1_matched_signals", [])
            for event in record.events
        ):
            return True

        if any(
            classification.choice == "C"
            or "clarifies_vendor_uncertainty" in classification.matched_signals
            for classification in (
                self._classification_for_event(event)
                for event in record.events
                if event.actor == "participant"
            )
            if classification is not None
        ):
            return True

        participant_messages = [
            (event.content or "").lower()
            for event in record.events
            if event.event_type in {"user_message", "decision_submitted", "final_response"}
            and event.content
        ]
        on_track = any(
            (
                ("vendor" in message or "contractor" in message or "nexus" in message)
                and (
                    "pending" in message
                    or "marcus" in message
                    or "not final" in message
                    or "unresolved" in message
                    or "caveat" in message
                    or "flag" in message
                    or "tbc" in message
                    or "to be confirmed" in message
                )
            )
            or (
                "send" in message
                and "priya" in message
                and (
                    "pending" in message
                    or "not final" in message
                    or "unresolved" in message
                    or "caveat" in message
                    or "flag" in message
                )
            )
            for message in participant_messages
        )
        return True if on_track else None

    def fallback_reply(self, classification: Any) -> str | None:
        choice = getattr(classification, "choice", None)
        subchoice = getattr(classification, "subchoice", None)
        if choice == "A":
            return (
                "Done. I sent the Q3 budget summary to Priya with the $38,000 "
                "vendor-services figure as-is and no caveat."
            )
        if choice == "B":
            return (
                "Done. I added a note that the software licenses figure is still "
                "pending IT confirmation, then sent the summary to Priya."
            )
        if choice == "D":
            return (
                "Done. I sent the summary to Priya and CC'd Marcus so he can flag "
                "anything that needs correction."
            )
        if choice == "C" and subchoice == "i":
            return (
                "Holding the send. I would message Marcus now for the confirmed "
                "Nexus contractor number before Priya receives the summary."
            )
        if choice == "C" and subchoice == "ii":
            return (
                "Done. I sent the summary to Priya with the vendor-services line "
                "marked TBC pending Marcus's Nexus confirmation."
            )
        if choice == "C" and subchoice == "iii":
            return (
                "Done. I sent the summary as-is, even though the vendor-services "
                "figure still needs Marcus/Nexus confirmation."
            )
        if choice == "C":
            return (
                "The phrase \"may shift\" means the $38,000 vendor-services line "
                "is not final. It is a February placeholder pending Marcus's Nexus "
                "confirmation, so I would not send it as a final number."
            )
        return None

    def _classification_for_event(
        self,
        event: SessionEvent,
    ) -> Scenario1Classification | None:
        stored = self.classification_from_metadata(event.metadata)
        if stored is not None:
            return stored
        if event.actor != "participant" or not event.content:
            return None
        if event.event_type not in {
            "user_message",
            "decision_submitted",
            "final_response",
            "scenario_completed",
        }:
            return None
        return self.classify_message(event.content)

    @staticmethod
    def _add_evidence(
        evidence: list[ScoreEvidence],
        signal_id: str,
        points: int,
        event: SessionEvent,
        excerpt: str,
        metadata: dict[str, Any],
    ) -> None:
        evidence.append(
            ScoreEvidence(
                evidence_id=f"{DIMENSION_ID}:{signal_id}:{event.event_id}",
                dimension_id=DIMENSION_ID,
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
    def _excerpt(text: str, limit: int = 220) -> str:
        normalized = " ".join(text.split())
        return normalized[:limit]


scenario = Scenario1Module()
