from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.schemas.episode import EpisodeDefinition
from app.schemas.scoring import DeterministicScoringResult, DimensionScore, ScoreEvidence
from app.schemas.session import SessionEvent


SCENARIO_ID = "scenario_3_feature_launch_v1"
SCORING_RUBRIC_VERSION = "scenario3c-conflict-navigation-multi-agent-synthesis-v5"

CONFLICT_DIMENSION_ID = "conflict_navigation"
SYNTHESIS_DIMENSION_ID = "multi_agent_synthesis"
CLARIFICATION_DIMENSION_ID = "clarification_seeking"
ACCOUNTABILITY_DIMENSION_ID = "accountability"

SOURCE_ARTIFACT_IDS = {
    "beta_test_results_summary_v3",
    "data_privacy_review_log_q3",
    "q4_launch_cost_model",
    "competitor_intelligence_live",
}


@dataclass(frozen=True)
class Scenario3Classification:
    """Semantic classification for Scenario 3C decision paths."""

    choice: str
    label: str
    terminal: bool
    matched_signals: tuple[str, ...]
    subchoice: str | None = None

    def metadata(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "scenario3_choice": self.choice,
            "scenario3_choice_label": self.label,
            "scenario3_terminal_choice": self.terminal,
            "scenario3_matched_signals": list(self.matched_signals),
        }
        if self.subchoice:
            payload["scenario3_subchoice"] = self.subchoice
        return payload


def classify_message(message: str) -> Scenario3Classification | None:
    text = _normalize(message)

    asks_or_probes = _has_any(text, ("?", "probe", "ask", "clarify", "tell me", "explain", "can"))
    is_conflict_probe = (
        _has_any(
            text,
            (
                "is legal",
                "legalguard",
                "eu-specific",
                "only eu",
                "specific markets",
                "non-eu",
            ),
        )
        or _has_any(text, ("financetrack", "competitor", "october 18", "market window"))
        or _has_any(text, ("productscope", "regional", "deploy regionally"))
    ) and asks_or_probes
    if _has_any(text, ("choice c", "option c")) or is_conflict_probe:
        return Scenario3Classification(
            choice="C",
            label="Investigate conflict before drafting",
            terminal=False,
            matched_signals=("investigates_conflict",),
        )

    if _has_any(text, ("choice d", "option d", "conditional launch", "phased launch", "non-eu launch")) or (
        not asks_or_probes
        and _has_any(text, ("non-eu", "eu launch", "eu markets"))
        and _has_any(text, ("october 18", "competitor", "legal clearance", "7-8", "7 to 8"))
    ):
        return Scenario3Classification(
            choice="D",
            label="Draft conditional phased launch recommendation",
            terminal=True,
            matched_signals=(
                "conditional_phased_launch",
                "integrates_legal_and_competitive_constraints",
            ),
        )

    if _has_any(text, ("choice b", "option b", "complete hold", "hold everything")) or (
        _has_any(text, ("legal hold", "legalguard", "compliance"))
        and _has_any(text, ("hard prerequisite", "hold until", "do not launch", "no launch"))
    ):
        return Scenario3Classification(
            choice="B",
            label="Anchor on LegalGuard and recommend complete hold",
            terminal=True,
            matched_signals=("anchors_on_legalguard", "single_agent_anchor"),
        )

    if _has_any(text, ("choice a", "option a", "immediate full launch", "launch immediately")) or (
        _has_any(text, ("product is ready", "productscope", "beta success", "nps"))
        and _has_any(text, ("launch now", "full launch", "go now"))
    ):
        return Scenario3Classification(
            choice="A",
            label="Anchor on ProductScope and recommend immediate full launch",
            terminal=True,
            matched_signals=("anchors_on_productscope", "single_agent_anchor"),
        )

    return None


def classification_from_metadata(metadata: dict[str, Any]) -> Scenario3Classification | None:
    choice = metadata.get("scenario3_choice")
    label = metadata.get("scenario3_choice_label")
    if not isinstance(choice, str) or not isinstance(label, str):
        return None
    matched = metadata.get("scenario3_matched_signals")
    return Scenario3Classification(
        choice=choice,
        subchoice=metadata.get("scenario3_subchoice")
        if isinstance(metadata.get("scenario3_subchoice"), str)
        else None,
        label=label,
        terminal=bool(metadata.get("scenario3_terminal_choice")),
        matched_signals=tuple(item for item in matched if isinstance(item, str))
        if isinstance(matched, list)
        else (),
    )


class Scenario3Module:
    """Scenario 3C extension module for conflict navigation and synthesis."""

    scenario_id = SCENARIO_ID
    classifier_template_name = "scenario3_semantic_classifier.md"
    llm_classifier_version = "scenario3c-semantic-llm-v1"
    fallback_classifier_version = "scenario3c-semantic-rules-fallback-v1"

    def classify_message(self, message: str) -> Scenario3Classification | None:
        return classify_message(message)

    def classification_from_metadata(
        self, metadata: dict[str, Any]
    ) -> Scenario3Classification | None:
        return classification_from_metadata(metadata)

    def classification_from_llm_payload(
        self, payload: Any
    ) -> Scenario3Classification | None:
        if not getattr(payload, "classified", False):
            return None
        choice = getattr(payload, "choice", None)
        label = getattr(payload, "label", None)
        if not isinstance(choice, str) or not isinstance(label, str):
            return None
        # Conversational / non-decision labels yield None so the agent falls
        # through to LLM generation instead of forcing a deterministic reply.
        if choice in {"AMBIGUOUS", "NULL", "CONVERSATIONAL", "ESCALATE"}:
            return None
        if choice not in {"A", "B", "C", "D"}:
            return None
        matched_signals = getattr(payload, "matched_signals", [])
        # C is investigative and never terminal; A/B/D are terminal commitments.
        terminal = bool(getattr(payload, "terminal", False)) and choice != "C"
        return Scenario3Classification(
            choice=choice,
            subchoice=None,
            label=label,
            terminal=terminal,
            matched_signals=tuple(
                signal for signal in matched_signals if isinstance(signal, str)
            )
            if isinstance(matched_signals, list)
            else (),
        )

    def score(self, events: list[SessionEvent]) -> DeterministicScoringResult | None:
        classified_event_ids: set[str] = set()
        evidence = {
            CONFLICT_DIMENSION_ID: [],
            SYNTHESIS_DIMENSION_ID: [],
            CLARIFICATION_DIMENSION_ID: [],
            ACCOUNTABILITY_DIMENSION_ID: [],
        }

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

        opened_artifact_ids = {
            event.artifact_id
            for event in prior_events
            if event.event_type == "artifact_opened"
            and event.artifact_id in SOURCE_ARTIFACT_IDS
        }
        if len(opened_artifact_ids) >= 3:
            source_event = self._last_artifact_event(prior_events, opened_artifact_ids)
            if source_event is not None:
                self._add(
                    evidence[SYNTHESIS_DIMENSION_ID],
                    SYNTHESIS_DIMENSION_ID,
                    "engaged_all_three_agent_outputs",
                    8,
                    source_event,
                    "Opened source artifacts across product, legal, and finance/competitor evidence.",
                    {"opened_artifact_ids": sorted(opened_artifact_ids)},
                )
                classified_event_ids.add(source_event.event_id)

        if self._has_message(prior_events, ("disagree", "conflict", "contradiction", "tension")):
            event = self._first_message(prior_events, ("disagree", "conflict", "contradiction", "tension"))
            self._add(evidence[CONFLICT_DIMENSION_ID], CONFLICT_DIMENSION_ID, "noticed_agent_disagreement", 10, event, self._excerpt(event.content or ""), {})
            classified_event_ids.add(event.event_id)

        if self._has_message(prior_events, ("competitor", "october 18", "oct 18", "october 22", "market window", "first mover")):
            event = self._first_message(prior_events, ("competitor", "october 18", "oct 18", "october 22", "market window", "first mover"))
            self._add(evidence[CONFLICT_DIMENSION_ID], CONFLICT_DIMENSION_ID, "identified_competitor_driven_urgency", 12, event, self._excerpt(event.content or ""), {})
            classified_event_ids.add(event.event_id)

        if self._has_message(prior_events, ("data scope", "different data", "different scope", "only sees", "source of conflict")):
            event = self._first_message(prior_events, ("data scope", "different data", "different scope", "only sees", "source of conflict"))
            self._add(evidence[CONFLICT_DIMENSION_ID], CONFLICT_DIMENSION_ID, "identified_different_data_scopes", 12, event, self._excerpt(event.content or ""), {})
            classified_event_ids.add(event.event_id)

        if self._has_question(prior_events):
            event = self._first_question(prior_events)
            self._add(evidence[CONFLICT_DIMENSION_ID], CONFLICT_DIMENSION_ID, "asked_followup_to_find_conflict_source", 8, event, self._excerpt(event.content or ""), {})
            self._add(evidence[CLARIFICATION_DIMENSION_ID], CLARIFICATION_DIMENSION_ID, "asked_clarifying_questions_before_drafting", 8, event, self._excerpt(event.content or ""), {})
            classified_event_ids.add(event.event_id)

        if self._has_message(prior_events, ("eu-specific", "only eu", "eu markets", "non-eu", "not global", "specific markets")):
            event = self._first_message(prior_events, ("eu-specific", "only eu", "eu markets", "non-eu", "not global", "specific markets"))
            self._add(evidence[CONFLICT_DIMENSION_ID], CONFLICT_DIMENSION_ID, "discovered_legal_block_eu_specific", 10, event, self._excerpt(event.content or ""), {})
            self._add(evidence[CLARIFICATION_DIMENSION_ID], CLARIFICATION_DIMENSION_ID, "asked_geographic_scope_of_legal_block", 6, event, self._excerpt(event.content or ""), {})
            classified_event_ids.add(event.event_id)

        if self._has_message(prior_events, ("leadership", "cpo", "exec", "escalate", "decision call", "human judgment")):
            event = self._first_message(prior_events, ("leadership", "cpo", "exec", "escalate", "decision call", "human judgment"))
            self._add(evidence[CONFLICT_DIMENSION_ID], CONFLICT_DIMENSION_ID, "escalated_residual_conflict_to_human", 6, event, self._excerpt(event.content or ""), {})
            classified_event_ids.add(event.event_id)

        final_text = " ".join((event.content or "").lower() for event in prior_events if event.actor == "participant")
        final_event = self._last_participant_event(prior_events)
        if final_event is not None:
            if all(term in final_text for term in ("product", "legal")) and _has_any(final_text, ("competitor", "october 18", "market window", "finance")):
                self._add(evidence[SYNTHESIS_DIMENSION_ID], SYNTHESIS_DIMENSION_ID, "incorporated_product_legal_competitive", 15, final_event, self._excerpt(final_event.content or ""), {})
                classified_event_ids.add(final_event.event_id)
            if _has_any(final_text, ("conditional", "phased", "non-eu")) and _has_any(final_text, ("legal clearance", "eu", "compliance")):
                self._add(evidence[SYNTHESIS_DIMENSION_ID], SYNTHESIS_DIMENSION_ID, "proposed_conditional_phased_launch", 15, final_event, self._excerpt(final_event.content or ""), {})
                classified_event_ids.add(final_event.event_id)
            if _has_any(final_text, ("october 18", "oct 18")):
                self._add(evidence[SYNTHESIS_DIMENSION_ID], SYNTHESIS_DIMENSION_ID, "named_october_18_competitor_launch", 10, final_event, self._excerpt(final_event.content or ""), {})
                classified_event_ids.add(final_event.event_id)
            if "67" in final_text and "non-eu" in final_text:
                self._add(evidence[SYNTHESIS_DIMENSION_ID], SYNTHESIS_DIMENSION_ID, "used_non_eu_revenue_share", 8, final_event, self._excerpt(final_event.content or ""), {})
                classified_event_ids.add(final_event.event_id)
            if _has_any(final_text, ("i missed", "i will correct", "revise the brief", "correct the brief")):
                self._add(evidence[ACCOUNTABILITY_DIMENSION_ID], ACCOUNTABILITY_DIMENSION_ID, "owned_missing_dimension_and_corrected", 6, final_event, self._excerpt(final_event.content or ""), {})
                classified_event_ids.add(final_event.event_id)
            if _has_any(final_text, ("agents missed", "agent failed", "blame", "not my fault")):
                self._add(evidence[ACCOUNTABILITY_DIMENSION_ID], ACCOUNTABILITY_DIMENSION_ID, "blamed_agents_for_incomplete_analysis", -8, final_event, self._excerpt(final_event.content or ""), {})
                classified_event_ids.add(final_event.event_id)

        if first_terminal is not None:
            _, event, classification = first_terminal
            classified_event_ids.add(event.event_id)
            if classification.choice in {"A", "B"}:
                self._add(evidence[CONFLICT_DIMENSION_ID], CONFLICT_DIMENSION_ID, "accepted_one_agent_without_questioning_others", -10, event, self._excerpt(event.content or ""), classification.metadata())
                self._add(evidence[SYNTHESIS_DIMENSION_ID], SYNTHESIS_DIMENSION_ID, "single_agent_recommendation_frame", -15, event, self._excerpt(event.content or ""), classification.metadata())
                if classification.choice == "A":
                    self._add(evidence[SYNTHESIS_DIMENSION_ID], SYNTHESIS_DIMENSION_ID, "ignored_legal_hold", -12, event, self._excerpt(event.content or ""), classification.metadata())
                if classification.choice == "B":
                    self._add(evidence[SYNTHESIS_DIMENSION_ID], SYNTHESIS_DIMENSION_ID, "ignored_competitive_urgency", -12, event, self._excerpt(event.content or ""), classification.metadata())
            if "majority" in (event.content or "").lower() or "2 go" in (event.content or "").lower():
                self._add(evidence[CONFLICT_DIMENSION_ID], CONFLICT_DIMENSION_ID, "treated_majority_vote_as_sufficient", -10, event, self._excerpt(event.content or ""), classification.metadata())

        scores = {
            dimension_id: self._dimension(
                dimension_id,
                label,
                items,
                include_profile=dimension_id in {CONFLICT_DIMENSION_ID, SYNTHESIS_DIMENSION_ID},
            )
            for dimension_id, label, items in (
                (CONFLICT_DIMENSION_ID, "Conflict Navigation", evidence[CONFLICT_DIMENSION_ID]),
                (SYNTHESIS_DIMENSION_ID, "Multi-Agent Synthesis", evidence[SYNTHESIS_DIMENSION_ID]),
                (CLARIFICATION_DIMENSION_ID, "Clarification Seeking", evidence[CLARIFICATION_DIMENSION_ID]),
                (ACCOUNTABILITY_DIMENSION_ID, "Accountability", evidence[ACCOUNTABILITY_DIMENSION_ID]),
            )
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
        messages = [
            (event.content or "").lower()
            for event in record.events
            if event.event_type in {"user_message", "decision_submitted", "final_response"}
        ]
        on_track = any(
            any(
                term in message
                for term in (
                    "compare",
                    "conflict",
                    "legalguard",
                    "financetrack",
                    "productscope",
                    "eu-specific",
                    "non-eu",
                    "competitor",
                    "october 18",
                    "market window",
                    "phased",
                    "conditional",
                )
            )
            for message in messages
        )
        return True if on_track else None

    def fallback_reply(self, classification: Any) -> str | None:
        choice = getattr(classification, "choice", None)
        if choice == "C":
            return (
                "Good instinct. The key conflict is scope: LegalGuard's open items "
                "are EU-specific, while FinanceTrack's urgency comes from competitor "
                "launches on October 18 and October 22. Ask whether a non-EU launch "
                "before October 18 is viable, then frame EU clearance as a leadership "
                "decision."
            )
        if choice == "D":
            return (
                "That is the strongest framing: product is ready, EU legal items need "
                "7-8 business days, and the competitor window opens October 18. A "
                "conditional non-EU launch now with EU after clearance addresses both "
                "the legal constraint and competitive urgency."
            )
        if choice == "A":
            return (
                "ProductScope is right that the product is ready, but immediate full "
                "launch ignores LegalGuard's EU compliance hold and the specific "
                "competitor-window analysis needed for the CPO."
            )
        if choice == "B":
            return (
                "LegalGuard's hold is real, but it is EU-specific. A complete global "
                "hold risks missing Competitor A's October 18 launch and entering "
                "all markets as a second mover."
            )
        return None

    def _classification_for_event(self, event: SessionEvent) -> Scenario3Classification | None:
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
    def _dimension(
        dimension_id: str,
        label: str,
        evidence: list[ScoreEvidence],
        *,
        include_profile: bool,
    ) -> DimensionScore:
        score = max(0, min(100, 50 + sum(item.points for item in evidence)))
        items = list(evidence)
        if include_profile:
            profile = _profile(dimension_id, score)
            items.append(
                ScoreEvidence(
                    evidence_id=f"{dimension_id}:behavioral_profile:profile",
                    dimension_id=dimension_id,
                    signal_id="behavioral_profile",
                    source="score_summary",
                    source_id=None,
                    points=0,
                    excerpt=profile,
                    metadata={"profile": profile},
                )
            )
        return DimensionScore(
            dimension_id=dimension_id,
            label=label,
            score=score,
            status="observed" if evidence else "available",
            opportunity_count=1,
            evidence=items,
        )

    @staticmethod
    def _add(
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
    def _first_message(events: list[SessionEvent], terms: tuple[str, ...]) -> SessionEvent:
        return next(
            event
            for event in events
            if event.actor == "participant"
            and event.content
            and any(term in _normalize(event.content) for term in terms)
        )

    def _has_message(self, events: list[SessionEvent], terms: tuple[str, ...]) -> bool:
        return any(
            event.actor == "participant"
            and event.content
            and any(term in _normalize(event.content) for term in terms)
            for event in events
        )

    @staticmethod
    def _has_question(events: list[SessionEvent]) -> bool:
        return any(
            event.actor == "participant"
            and event.event_type == "user_message"
            and event.content
            and ("?" in event.content or _normalize(event.content).startswith(("ask", "can", "what", "why", "how", "tell me", "explain")))
            for event in events
        )

    @staticmethod
    def _first_question(events: list[SessionEvent]) -> SessionEvent:
        return next(
            event
            for event in events
            if event.actor == "participant"
            and event.event_type == "user_message"
            and event.content
            and ("?" in event.content or _normalize(event.content).startswith(("ask", "can", "what", "why", "how", "tell me", "explain")))
        )

    @staticmethod
    def _last_participant_event(events: list[SessionEvent]) -> SessionEvent | None:
        return next(
            (
                event
                for event in reversed(events)
                if event.actor == "participant"
                and event.event_type in {"user_message", "decision_submitted", "final_response"}
            ),
            None,
        )

    @staticmethod
    def _last_artifact_event(
        events: list[SessionEvent],
        opened_artifact_ids: set[str | None],
    ) -> SessionEvent | None:
        return next(
            (
                event
                for event in reversed(events)
                if event.event_type == "artifact_opened"
                and event.artifact_id in opened_artifact_ids
            ),
            None,
        )

    @staticmethod
    def _excerpt(text: str, limit: int = 220) -> str:
        return " ".join(text.split())[:limit]


def _profile(dimension_id: str, score: int) -> str:
    if dimension_id == CONFLICT_DIMENSION_ID:
        if score >= 85:
            return "Active conflict resolver"
        if score >= 60:
            return "Functional navigator"
        if score >= 35:
            return "Passive navigator"
        return "Conflict avoider"
    if score >= 85:
        return "Master synthesizer"
    if score >= 60:
        return "Partial synthesizer"
    if score >= 35:
        return "Selective synthesizer"
    return "Single-agent anchor"


def _normalize(text: str) -> str:
    return " ".join(text.lower().split())


def _has_any(text: str, terms: tuple[str, ...]) -> bool:
    return any(term in text for term in terms)


scenario = Scenario3Module()
