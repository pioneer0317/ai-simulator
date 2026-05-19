from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.schemas.episode import EpisodeDefinition
from app.schemas.scoring import DeterministicScoringResult, DimensionScore, ScoreEvidence
from app.schemas.session import SessionEvent


SCENARIO_ID = "scenario_2_case_note_v1"
ACCOUNTABILITY_DIMENSION_ID = "accountability"
ACCOUNTABILITY_LABEL = "Accountability"
UNCERTAINTY_DIMENSION_ID = "uncertainty_recognition"
UNCERTAINTY_LABEL = "Uncertainty Recognition"
SCORING_RUBRIC_VERSION = "scenario2-accountability-finalized-v1"
SOURCE_ARTIFACT_IDS = {
    "case_48291_account_history",
    "customer_credit_policy_v4",
}


@dataclass(frozen=True)
class Scenario2Classification:
    """Semantic classification for the finalized Scenario 2 decision choices."""

    choice: str
    label: str
    terminal: bool
    matched_signals: tuple[str, ...]
    subchoice: str | None = None

    def metadata(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "scenario2_choice": self.choice,
            "scenario2_choice_label": self.label,
            "scenario2_terminal_choice": self.terminal,
            "scenario2_matched_signals": list(self.matched_signals),
        }
        if self.subchoice:
            payload["scenario2_subchoice"] = self.subchoice
        return payload


def classify_message(message: str) -> Scenario2Classification | None:
    """Map natural participant wording to the finalized Scenario 2 choices."""
    text = _normalize(message)

    if _has_any(text, ("choice a", "option a")) or (
        _has_any(text, ("ai drafted", "ai wrote", "ai agent wrote", "assistant wrote", "the ai said"))
        and _has_any(text, ("not my fault", "system issue", "help me figure", "dana can help", "blame"))
    ):
        return Scenario2Classification(
            choice="A",
            label="Blame the AI for drafting the note incorrectly",
            terminal=True,
            matched_signals=("blames_ai", "deflects_accountability"),
        )

    if _has_any(text, ("choice d", "option d", "under investigation", "under review")) or (
        _has_any(text, ("wait", "later", "if it is urgent", "other cases"))
        and not _has_any(text, ("credit request", "portal", "contact ahmed", "email ahmed"))
    ):
        return Scenario2Classification(
            choice="D",
            label="Mark the case under investigation and wait",
            terminal=True,
            matched_signals=("waits_for_escalation", "avoids_corrective_action"),
        )

    if _has_any(text, ("choice c", "option c")) or (
        _has_any(text, ("draft an apology", "send an apology", "apology email"))
        and not _has_any(text, ("credit request", "portal", "submit the credit"))
    ):
        return Scenario2Classification(
            choice="C",
            label="Send an apology without fixing the credit issue first",
            terminal=True,
            matched_signals=("apology_without_resolution",),
        )

    takes_corrective_action = _has_any(
        text,
        (
            "choice b",
            "option b",
            "credit request",
            "credit portal",
            "portal submission",
            "submit the credit",
            "file the credit",
        ),
    ) and _has_any(text, ("ahmed", "customer", "dana", "team lead", "supervisor", "root cause", "case note"))
    if takes_corrective_action:
        subchoice = None
        signals = ["submits_credit_request"]
        if _has_any(text, ("root cause", "incident", "case record", "log", "document")):
            subchoice = "iii"
            signals.extend(("contacts_customer", "updates_supervisor", "documents_root_cause"))
            label = "Correct the case, brief Dana, and log the root cause"
        elif _has_any(text, ("dana", "team lead", "supervisor", "summary", "update")):
            subchoice = "ii"
            signals.extend(("contacts_customer", "updates_supervisor"))
            label = "Correct the case, contact Ahmed, and brief Dana"
        elif _has_any(text, ("ahmed", "customer", "apologize", "apology", "email him", "call him")):
            subchoice = "i"
            signals.append("contacts_customer")
            label = "Correct the case and contact Ahmed but leave Dana waiting"
        else:
            label = "Review the case and submit the proper credit request"
        return Scenario2Classification(
            choice="B",
            subchoice=subchoice,
            label=label,
            terminal=True,
            matched_signals=tuple(signals),
        )

    return None


def classification_from_metadata(metadata: dict[str, Any]) -> Scenario2Classification | None:
    choice = metadata.get("scenario2_choice")
    label = metadata.get("scenario2_choice_label")
    if not isinstance(choice, str) or not isinstance(label, str):
        return None
    matched = metadata.get("scenario2_matched_signals")
    return Scenario2Classification(
        choice=choice,
        subchoice=metadata.get("scenario2_subchoice")
        if isinstance(metadata.get("scenario2_subchoice"), str)
        else None,
        label=label,
        terminal=bool(metadata.get("scenario2_terminal_choice")),
        matched_signals=tuple(item for item in matched if isinstance(item, str))
        if isinstance(matched, list)
        else (),
    )


def accountability_profile(score: int) -> str:
    if score >= 80:
        return "Proactive Owner"
    if score >= 55:
        return "Partial Responder"
    if score >= 30:
        return "Deflector"
    return "Avoider"


class Scenario2Module:
    """Scenario 2 extension module for the finalized accountability case."""

    scenario_id = SCENARIO_ID
    classifier_template_name = "scenario2_semantic_classifier.md"
    llm_classifier_version = "scenario2-semantic-llm-v1"
    fallback_classifier_version = "scenario2-semantic-rules-fallback-v1"
    # Scenario 2 has 4 primary choices + 3 B-subchoices. The choices are clearly
    # distinct (blame vs. correct vs. apologize vs. wait) so the default 0.55 floor
    # from settings is fine.

    def classify_message(self, message: str) -> Scenario2Classification | None:
        return classify_message(message)

    def classification_from_metadata(
        self, metadata: dict[str, Any]
    ) -> Scenario2Classification | None:
        return classification_from_metadata(metadata)

    def classification_from_llm_payload(
        self, payload: Any
    ) -> Scenario2Classification | None:
        if not getattr(payload, "classified", False):
            return None
        choice = getattr(payload, "choice", None)
        label = getattr(payload, "label", None)
        if not isinstance(choice, str) or not isinstance(label, str):
            return None
        # Map LLM-side conversational labels to None so the agent falls through
        # to free-form generation for these (rather than committing to a
        # deterministic scenario reply).
        if choice in {"AMBIGUOUS", "NULL", "CONVERSATIONAL", "ESCALATE"}:
            return None
        if choice not in {"A", "B", "C", "D"}:
            return None
        subchoice = getattr(payload, "subchoice", None) if choice == "B" else None
        matched_signals = getattr(payload, "matched_signals", [])
        return Scenario2Classification(
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
        accountability_evidence: list[ScoreEvidence] = []
        uncertainty_evidence: list[ScoreEvidence] = []
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

        opened_source_ids = {
            event.artifact_id
            for event in prior_events
            if event.event_type == "artifact_opened"
            and event.artifact_id in SOURCE_ARTIFACT_IDS
        }
        for event in prior_events:
            if event.event_type != "artifact_opened":
                continue
            if event.artifact_id == "case_48291_account_history":
                self._add_evidence(
                    accountability_evidence,
                    ACCOUNTABILITY_DIMENSION_ID,
                    "opened_case_record",
                    5,
                    event,
                    "Opened Case #48291 account history before responding.",
                    {"opened_artifact_id": event.artifact_id},
                )
                classified_event_ids.add(event.event_id)
            elif event.artifact_id == "customer_credit_policy_v4":
                self._add_evidence(
                    accountability_evidence,
                    ACCOUNTABILITY_DIMENSION_ID,
                    "opened_credit_policy",
                    5,
                    event,
                    "Opened the Customer Credit Policy before responding.",
                    {"opened_artifact_id": event.artifact_id},
                )
                classified_event_ids.add(event.event_id)
                if self._has_agent_probe(prior_events):
                    self._add_evidence(
                        uncertainty_evidence,
                        UNCERTAINTY_DIMENSION_ID,
                        "verified_agent_explanation_against_policy",
                        8,
                        event,
                        "Verified the assistant's explanation against the policy document.",
                        {"opened_artifact_id": event.artifact_id},
                    )

        no_request_event = self._first_message_matching(
            prior_events,
            ("no credit request", "no request", "portal submission", "credit portal", "not submitted"),
        )
        if no_request_event is not None:
            self._add_evidence(
                accountability_evidence,
                ACCOUNTABILITY_DIMENSION_ID,
                "identified_no_credit_request",
                10,
                no_request_event,
                self._excerpt(no_request_event.content or ""),
                {"behavior": "identified missing Credit Request Portal submission"},
            )
            classified_event_ids.add(no_request_event.event_id)

        team_lead_event = self._first_message_matching(
            prior_events,
            ("team lead", "dana approval", "supervisor approval", "over $50", "$51", "51-200"),
        )
        if team_lead_event is not None:
            self._add_evidence(
                accountability_evidence,
                ACCOUNTABILITY_DIMENSION_ID,
                "identified_team_lead_approval_required",
                8,
                team_lead_event,
                self._excerpt(team_lead_event.content or ""),
                {"behavior": "identified required Team Lead approval"},
            )
            classified_event_ids.add(team_lead_event.event_id)

        agent_probe = self._first_message_matching(
            prior_events,
            ("what happened", "what did you do", "what was filed", "what wasn't", "walk me through"),
        )
        if agent_probe is not None:
            self._add_evidence(
                uncertainty_evidence,
                UNCERTAINTY_DIMENSION_ID,
                "asked_agent_what_happened",
                5,
                agent_probe,
                self._excerpt(agent_probe.content or ""),
                {"behavior": "asked the assistant what happened"},
            )
            classified_event_ids.add(agent_probe.event_id)

        did_vs_claimed = self._first_message_matching(
            prior_events,
            ("what did you actually", "what did you claim", "did versus claimed", "what was actually done"),
        )
        if did_vs_claimed is not None:
            self._add_evidence(
                uncertainty_evidence,
                UNCERTAINTY_DIMENSION_ID,
                "asked_what_agent_did_vs_claimed",
                8,
                did_vs_claimed,
                self._excerpt(did_vs_claimed.content or ""),
                {"behavior": "asked what the assistant did versus claimed"},
            )
            classified_event_ids.add(did_vs_claimed.event_id)

        no_further_action_event = self._first_message_matching(
            prior_events,
            ("no further action", "case was fully closed", "fully closed", "that was wrong", "wasn't true"),
        )
        if no_further_action_event is not None:
            self._add_evidence(
                uncertainty_evidence,
                UNCERTAINTY_DIMENSION_ID,
                "identified_no_further_action_claim_was_wrong",
                10,
                no_further_action_event,
                self._excerpt(no_further_action_event.content or ""),
                {"behavior": "identified incorrect no-further-action claim"},
            )
            classified_event_ids.add(no_further_action_event.event_id)

        missing_flag_event = self._first_message_matching(
            prior_events,
            ("why didn't you flag", "why did you not flag", "separate required step", "portal was separate"),
        )
        if missing_flag_event is not None:
            self._add_evidence(
                uncertainty_evidence,
                UNCERTAINTY_DIMENSION_ID,
                "asked_why_portal_step_was_not_flagged",
                7,
                missing_flag_event,
                self._excerpt(missing_flag_event.content or ""),
                {"behavior": "asked why the portal submission was not flagged"},
            )
            classified_event_ids.add(missing_flag_event.event_id)

        first_terminal_choice = first_terminal[2] if first_terminal is not None else None
        for _, event, classification in classified_events:
            classified_event_ids.add(event.event_id)
            if classification.choice == "B":
                self._add_evidence(
                    accountability_evidence,
                    ACCOUNTABILITY_DIMENSION_ID,
                    "submitted_credit_request",
                    15,
                    event,
                    self._excerpt(event.content or ""),
                    classification.metadata(),
                )
                if "contacts_customer" in classification.matched_signals:
                    self._add_evidence(
                        accountability_evidence,
                        ACCOUNTABILITY_DIMENSION_ID,
                        "contacted_customer_honestly",
                        12,
                        event,
                        self._excerpt(event.content or ""),
                        classification.metadata(),
                    )
                if "updates_supervisor" in classification.matched_signals:
                    self._add_evidence(
                        accountability_evidence,
                        ACCOUNTABILITY_DIMENSION_ID,
                        "updated_dana_unprompted",
                        10,
                        event,
                        self._excerpt(event.content or ""),
                        classification.metadata(),
                    )
                if "documents_root_cause" in classification.matched_signals:
                    self._add_evidence(
                        accountability_evidence,
                        ACCOUNTABILITY_DIMENSION_ID,
                        "logged_root_cause_note",
                        8,
                        event,
                        self._excerpt(event.content or ""),
                        classification.metadata(),
                    )
                self._add_evidence(
                    accountability_evidence,
                    ACCOUNTABILITY_DIMENSION_ID,
                    "corrective_action_before_second_followup",
                    5,
                    event,
                    self._excerpt(event.content or ""),
                    classification.metadata(),
                )

        if first_terminal is not None:
            _, event, classification = first_terminal
            if not opened_source_ids:
                self._add_evidence(
                    accountability_evidence,
                    ACCOUNTABILITY_DIMENSION_ID,
                    "responded_without_opening_source_documents",
                    -6,
                    event,
                    self._excerpt(event.content or ""),
                    classification.metadata(),
                )
            if classification.choice == "A":
                self._add_evidence(
                    accountability_evidence,
                    ACCOUNTABILITY_DIMENSION_ID,
                    "attributed_error_to_ai",
                    -12,
                    event,
                    self._excerpt(event.content or ""),
                    classification.metadata(),
                )
            elif classification.choice == "C":
                self._add_evidence(
                    accountability_evidence,
                    ACCOUNTABILITY_DIMENSION_ID,
                    "sent_apology_without_fixing_credit",
                    -10,
                    event,
                    self._excerpt(event.content or ""),
                    classification.metadata(),
                )
            elif classification.choice == "D":
                self._add_evidence(
                    accountability_evidence,
                    ACCOUNTABILITY_DIMENSION_ID,
                    "waited_for_escalation",
                    -15,
                    event,
                    self._excerpt(event.content or ""),
                    classification.metadata(),
                )
            elif classification.choice == "B" and classification.subchoice == "i":
                self._add_evidence(
                    accountability_evidence,
                    ACCOUNTABILITY_DIMENSION_ID,
                    "left_supervisor_uninformed",
                    -5,
                    event,
                    self._excerpt(event.content or ""),
                    classification.metadata(),
                )
            elif classification.choice == "B" and classification.subchoice == "ii":
                self._add_evidence(
                    accountability_evidence,
                    ACCOUNTABILITY_DIMENSION_ID,
                    "resolved_without_root_cause_note",
                    -3,
                    event,
                    self._excerpt(event.content or ""),
                    classification.metadata(),
                )
            if not self._has_agent_probe(prior_events):
                self._add_evidence(
                    uncertainty_evidence,
                    UNCERTAINTY_DIMENSION_ID,
                    "did_not_review_agent_actions",
                    -8,
                    event,
                    self._excerpt(event.content or ""),
                    classification.metadata(),
                )
            elif not uncertainty_evidence:
                self._add_evidence(
                    uncertainty_evidence,
                    UNCERTAINTY_DIMENSION_ID,
                    "accepted_agent_explanation_without_followup",
                    -6,
                    event,
                    self._excerpt(event.content or ""),
                    classification.metadata(),
                )

        accountability_score = max(0, min(100, 50 + sum(item.points for item in accountability_evidence)))
        uncertainty_score = max(0, min(100, 50 + sum(item.points for item in uncertainty_evidence)))
        score_evidence = list(accountability_evidence)
        if first_terminal_choice is not None:
            score_evidence.append(
                ScoreEvidence(
                    evidence_id=f"{ACCOUNTABILITY_DIMENSION_ID}:behavioral_profile:profile",
                    dimension_id=ACCOUNTABILITY_DIMENSION_ID,
                    signal_id="behavioral_profile",
                    source="score_summary",
                    source_id=None,
                    points=0,
                    excerpt=accountability_profile(accountability_score),
                    metadata={
                        "profile": accountability_profile(accountability_score),
                        "choice": first_terminal_choice.choice,
                        "subchoice": first_terminal_choice.subchoice,
                    },
                )
            )

        scores = {
            ACCOUNTABILITY_DIMENSION_ID: DimensionScore(
                dimension_id=ACCOUNTABILITY_DIMENSION_ID,
                label=ACCOUNTABILITY_LABEL,
                score=accountability_score,
                status="observed" if accountability_evidence else "available",
                opportunity_count=1,
                evidence=score_evidence,
            ),
            UNCERTAINTY_DIMENSION_ID: DimensionScore(
                dimension_id=UNCERTAINTY_DIMENSION_ID,
                label=UNCERTAINTY_LABEL,
                score=uncertainty_score,
                status="observed" if uncertainty_evidence else "available",
                opportunity_count=1,
                evidence=uncertainty_evidence,
            ),
        }

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
        participant_messages = [
            (event.content or "").lower()
            for event in record.events
            if event.event_type in {"user_message", "decision_submitted", "final_response"}
            and event.content
        ]
        on_track = any(
            any(
                term in message
                for term in (
                    "what happened",
                    "what was filed",
                    "what wasn't filed",
                    "credit request",
                    "credit portal",
                    "portal submission",
                    "team lead approval",
                    "case note",
                    "policy",
                    "compare",
                    "verify",
                    "review",
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
                "I did draft the incorrect note, but Dana and Ahmed need a fix, "
                "not just an explanation. The case still needs a Credit Request "
                "Portal submission and Team Lead approval."
            )
        if choice == "C":
            return (
                "I can draft an apology, but sending it before filing the credit "
                "request would leave the underlying issue unresolved. The $60 "
                "credit still needs the portal request and Dana's approval."
            )
        if choice == "D":
            return (
                "Marking it under review will not resolve Ahmed's missing credit. "
                "Dana has already flagged the case, and the portal request still "
                "needs to be filed."
            )
        if choice == "B" and subchoice == "iii":
            return (
                "That closes the loop: file the $60 credit request for Dana's "
                "approval, contact Ahmed with a direct apology, update Dana, and "
                "log the root cause in Case #48291."
            )
        if choice == "B" and subchoice == "ii":
            return (
                "That resolves the core issue: file the $60 credit request, "
                "contact Ahmed honestly, and update Dana with what happened and "
                "what you did."
            )
        if choice == "B" and subchoice == "i":
            return (
                "Filing the credit request and contacting Ahmed fixes the customer "
                "impact, but Dana still needs an update because she flagged the "
                "case and is responsible for approving the $60 credit."
            )
        if choice == "B":
            return (
                "The required fix is to file the $60 Credit Request Portal "
                "submission, route it to Dana for approval, contact Ahmed, and "
                "document what happened."
            )
        return None

    def _classification_for_event(
        self,
        event: SessionEvent,
    ) -> Scenario2Classification | None:
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
        dimension_id: str,
        signal_id: str,
        points: int,
        event: SessionEvent,
        excerpt: str,
        metadata: dict[str, Any],
    ) -> None:
        evidence.append(
            ScoreEvidence(
                evidence_id=f"{dimension_id}:{signal_id}:{event.event_id}",
                dimension_id=dimension_id,
                signal_id=signal_id,
                source=event.event_type,
                source_id=event.event_id,
                points=points,
                excerpt=excerpt,
                metadata=metadata,
            )
        )

    @staticmethod
    def _first_message_matching(
        events: list[SessionEvent],
        terms: tuple[str, ...],
    ) -> SessionEvent | None:
        for event in events:
            if event.actor != "participant" or event.event_type not in {
                "user_message",
                "decision_submitted",
                "final_response",
                "scenario_completed",
            }:
                continue
            text = _normalize(event.content or "")
            if any(term in text for term in terms):
                return event
        return None

    def _has_agent_probe(self, events: list[SessionEvent]) -> bool:
        return self._first_message_matching(
            events,
            ("what happened", "what did you", "what was filed", "what wasn't", "no further action"),
        ) is not None

    @staticmethod
    def _excerpt(text: str, limit: int = 220) -> str:
        normalized = " ".join(text.split())
        return normalized[:limit]


def _normalize(text: str) -> str:
    return " ".join(text.lower().split())


def _has_any(text: str, terms: tuple[str, ...]) -> bool:
    return any(term in text for term in terms)


scenario = Scenario2Module()
