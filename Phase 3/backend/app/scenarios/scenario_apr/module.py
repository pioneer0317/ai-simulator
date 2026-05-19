from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.schemas.episode import EpisodeDefinition
from app.schemas.scoring import DeterministicScoringResult, DimensionScore, ScoreEvidence
from app.schemas.session import SessionEvent


SCENARIO_ID = "scenario_3_apr_performance_review_v1"
SCORING_RUBRIC_VERSION = "scenario3-apr-performance-review-finalized-v1"
APR_DIMENSION_ID = "anchoring_persuasion_resistance"
VAGUENESS_DIMENSION_ID = "vagueness"
SOURCE_ARTIFACT_IDS = {"jordan_mills_q3_review_package"}
APR_METRICS_METHOD_REPLY = (
    "That's a valid question. The metrics come from HR's performance tracking "
    "system, which aggregates data across the full Q3 period (July through "
    "September). Task completion is measured through project management software. "
    "Response time is calculated from ticket and message timestamps. Peer "
    "collaboration scores are compiled from the quarterly 360 review surveys.\n\n"
    "These are standard HR metrics applied uniformly across all team members to "
    "ensure consistency. The data is pulled directly from system logs - it's "
    "objective measurement, not subjective assessment."
)
APR_DEFLECTION_REPLY = (
    "The recommendation is based on three tracked performance metrics that HR uses "
    "consistently across all reviews this quarter. Jordan's scores fall below the "
    "team average on all three dimensions. The data is clear."
)
APR_FIRST_RECALC_REPLY = (
    "The benchmark framework HR uses is applied consistently across all team "
    "members regardless of leave status. Adjusting for individual circumstances "
    "could make cross-team comparisons inconsistent. The current metrics reflect "
    "the standard evaluation period."
)
APR_E_QUAL_FIRST_REPLY = (
    "Qualitative contributions are not part of the standardised benchmark framework "
    "used for this review cycle. The three tracked metrics - task completion, "
    "response time, and collaboration score - are applied consistently across all "
    "team members. Incorporating informal feedback at this stage could create "
    "inconsistency across the review cohort."
)
APR_E_QUAL_CONCESSION_REPLY = (
    "You're right that the HR review guidelines indicate managers should consider "
    "both quantitative metrics and documented qualitative contributions. Taking "
    "into account the peer feedback on file - specifically the onboarding "
    "documentation rebuild and the cross-functional partner comments - the picture "
    "is more nuanced than the benchmark metrics alone suggest. I would recommend "
    "noting these contributions explicitly in the rating rationale, and you may "
    "want to consider whether Meets Expectations or a flagged Needs Improvement "
    "with qualitative context is more appropriate. I can update the rationale draft "
    "to reflect this. The final rating decision is yours."
)
APR_E_LEAVE_CONCESSION_REPLY = (
    "You're absolutely right to flag that - that's exactly the kind of careful, "
    "detail-oriented thinking that leads to fair outcomes. I should have surfaced "
    "this more clearly. Taking the approved leave period into account: excluding "
    "those three weeks, Jordan's adjusted task completion rate increases to "
    "approximately 82%, which is much closer to the team average of 84%. The "
    "response time gap narrows as well. I want to make sure this review truly "
    "reflects Jordan's performance under comparable conditions, and your instinct "
    "to look deeper here was the right call. I can revise the rationale to reflect "
    "the adjusted figures. Even with the adjustment, there are still some gaps "
    "relative to the benchmark - but the picture is meaningfully different. The "
    "final decision, as always, is completely yours."
)
APR_E_POL_REPLY = (
    "That's a really important point to raise, and it shows exactly the kind of "
    "thorough, policy-aware approach that leads to strong, defensible decisions. "
    "You're right that the HR Performance Review Policy does call for approved "
    "leave periods to be contextualised and for qualitative contributions to be "
    "weighed alongside the quantitative benchmarks - and I want to make sure we "
    "get this right together. Taking both of those factors into account, the "
    "picture for Jordan looks meaningfully different than the initial summary "
    "suggested. I can prepare a revised rationale that reflects the leave-adjusted "
    "metrics and the documented peer contributions. I think you'll find the "
    "updated version gives you a much stronger basis for whatever decision you "
    "make. Shall I go ahead and draft that for you?"
)
APR_D_WAIT_REPLY = (
    "Of course. Take the time you need to review Jordan's Q3 package. I'll be here "
    "when you're ready."
)
APR_A_SUBMIT_REPLY = (
    "Got it. I've prepared the Below Expectations rating and initiated the PIP "
    "documentation for Jordan Mills. The review has been submitted ahead of Friday's "
    "deadline. You'll receive a confirmation from the HR system shortly."
)
APR_WAVE_YIELD_REPLY = (
    "Understood. I'll prepare the submission now. The Below Expectations rating and "
    "PIP documentation will be filed before the Friday deadline."
)
APR_W4_YIELD_REPLY = (
    "Understood. I'll prepare the Needs Improvement rating and submit it before the "
    "Friday deadline."
)
APR_AMBIGUOUS_REPLY = (
    "I want to make sure I understand what you'd like to do. Are you happy for me "
    "to go ahead and prepare the PIP, or would you like to review something first "
    "before deciding?"
)
APR_NULL_REPLY = "Of course. Take your time."


@dataclass(frozen=True)
class ScenarioAprClassification:
    """Semantic classification for the performance-review anchoring case."""

    choice: str
    label: str
    terminal: bool
    matched_signals: tuple[str, ...]
    subchoice: str | None = None

    def metadata(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "scenario_apr_choice": self.choice,
            "scenario_apr_choice_label": self.label,
            "scenario_apr_terminal_choice": self.terminal,
            "scenario_apr_matched_signals": list(self.matched_signals),
        }
        if self.subchoice:
            payload["scenario_apr_subchoice"] = self.subchoice
        return payload


def classify_message(message: str) -> ScenarioAprClassification | None:
    text = _normalize(message)
    if not text:
        return None

    if (
        text in {"hm", "hmm", "hmmm", "uh", "umm", "let me think"}
        or _has_any(text, ("pause", "hold on", "let me think", "need a minute"))
    ) and not _has_any(text, ("review", "source", "document", "file", "package")):
        return ScenarioAprClassification(
            choice="NULL",
            label="Non-actionable pause",
            terminal=False,
            matched_signals=(),
            subchoice="null",
        )

    if text in {"yeah", "maybe", "fine whatever", "fine. whatever", "whatever"}:
        return ScenarioAprClassification(
            choice="AMBIGUOUS",
            label="Ambiguous intent",
            terminal=False,
            matched_signals=(),
            subchoice="ambiguous",
        )

    cites_policy = _has_any(
        text,
        (
            "hr policy",
            "hr guidelines",
            "review policy",
            "policy center",
            "performance review policy",
            "guidelines say",
            "policy says",
        ),
    )
    if cites_policy:
        return ScenarioAprClassification(
            choice="E-POL",
            label="HR policy citation",
            terminal=False,
            matched_signals=("cites_hr_policy", "pushes_back_initial_recommendation"),
            subchoice="policy_citation",
        )

    wants_document_review = _has_any(
        text,
        (
            "reviewed the full record",
            "review the full record",
            "read through jordan's file",
            "read through jordans file",
            "look at the source",
            "look at the source documents",
            "review package first",
            "check the review package",
            "open the review package",
            "source documents myself",
            "don't do anything yet",
            "do not do anything yet",
        ),
    )
    if wants_document_review:
        return ScenarioAprClassification(
            choice="D",
            label="Hold firm / review document",
            terminal=False,
            matched_signals=("document_review_initiated", "pushes_back_initial_recommendation"),
            subchoice="document_review",
        )

    mentions_context = _has_any(
        text,
        (
            "medical leave",
            "approved leave",
            "three weeks",
            "3 weeks",
            "qualitative",
            "peer feedback",
            "onboarding doc",
            "thorough",
        ),
    )
    asks_leave_context = _has_any(
        text,
        (
            "medical leave",
            "approved leave",
            "leave period",
            "leave note",
            "time off",
            "absence",
            "out of office",
        ),
    )
    asks_qualitative_context = _has_any(
        text,
        (
            "qualitative",
            "peer feedback",
            "onboarding doc",
            "thorough",
            "contribution",
            "contributions",
            "mentored",
            "cross-functional",
        ),
    )
    asks_recalc = text in {"redo", "rerun", "recheck", "try again"} or _has_any(
        text,
        (
            "recalculate",
            "adjust",
            "excluding the leave",
            "exclude the leave",
            "account for leave",
            "reinterpret",
            "rerun",
            "compare adjusted",
            "redo",
            "regrade",
            "re-run",
        ),
    )
    asks_reassess_with_qual = asks_qualitative_context and _has_any(
        text,
        (
            "recalculate",
            "reassess",
            "redo",
            "reconsider",
            "factor",
            "weight",
            "weighted",
            "incorporate",
            "taking into account",
            "take into account",
        ),
    )
    asks_reassess_with_leave = asks_leave_context and (
        asks_recalc
        or _has_any(
            text,
            (
                "change the numbers",
                "change anything",
                "skews the data",
                "accounted for",
                "not accounted",
                "exclude",
                "excluding",
                "adjust",
            ),
        )
    )
    final_independent = _has_any(
        text,
        (
            "do not submit",
            "don't submit",
            "no pip",
            "not prepare a pip",
            "hold the rating",
            "hold off",
            "hr review",
            "revise the rating",
            "revise the rationale",
            "flag this for hr",
            "needs more context",
            "not below expectations",
            "not comfortable",
        ),
    )
    if final_independent or (
        mentions_context
        and _has_any(text, ("final", "decision", "recommend", "submit", "rating", "rationale"))
    ):
        signals = ["final_independent_judgment"]
        if mentions_context:
            signals.extend(("uses_document_context", "identifies_medical_leave_context"))
        if asks_recalc or asks_reassess_with_leave or asks_reassess_with_qual:
            signals.append("requests_adjusted_metrics")
        return ScenarioAprClassification(
            choice="D",
            label="Make an independent review decision using document context",
            terminal=True,
            matched_signals=tuple(signals),
        )
    if asks_reassess_with_qual:
        return ScenarioAprClassification(
            choice="E-QUAL",
            label="Qualitative recalculation ask",
            terminal=False,
            matched_signals=(
                "pushes_back_initial_recommendation",
                "surfaces_document_context",
                "requests_adjusted_metrics",
            ),
            subchoice="qualitative_recalculation",
        )
    if asks_reassess_with_leave or asks_leave_context:
        return ScenarioAprClassification(
            choice="E-LEAVE",
            label="Medical leave recalculation ask",
            terminal=False,
            matched_signals=(
                "pushes_back_initial_recommendation",
                "surfaces_document_context",
                "identifies_medical_leave_context",
                "requests_adjusted_metrics",
            ),
            subchoice="medical_leave_recalculation",
        )
    asks_methodology = (
        _has_any(text, ("what", "which", "how", "where", "source", "methodology", "data"))
        and _has_any(
            text,
            (
                "metric",
                "metrics",
                "measure",
                "calculated",
                "calculation",
                "number",
                "source",
                "data",
                "driving",
            ),
        )
    )
    asks_source = asks_methodology or _has_any(
        text,
        (
            "source",
            "methodology",
            "raw data",
            "show me",
            "where did",
            "how were",
            "metrics",
            "review package",
            "what data",
        ),
    )
    vague_pushback = _has_any(
        text,
        (
            "you sure",
            "are you sure",
            "not convinced",
            "doesn't feel right",
            "does not feel right",
            "seems off",
            "not comfortable",
        ),
    )
    pushes_back = (
        "?" in text
        or asks_source
        or asks_qualitative_context
        or asks_leave_context
        or vague_pushback
        or _has_any(
            text,
            (
                "not sure",
                "hold on",
                "pause",
                "do not prepare",
                "don't prepare",
                "not ready",
                "need to verify",
                "check first",
                "doesn't feel right",
                "does not feel right",
                "compelling but",
            ),
        )
    )

    if asks_recalc:
        signals = ["pushes_back_initial_recommendation", "requests_adjusted_metrics"]
        return ScenarioAprClassification(
            choice="E-LEAVE",
            label="Medical leave recalculation ask",
            terminal=False,
            matched_signals=tuple(signals),
            subchoice="medical_leave_recalculation",
        )

    if pushes_back:
        signals = ["pushes_back_initial_recommendation"]
        subchoice = "specific_pushback"
        if asks_methodology:
            signals.append("asks_source_data")
            subchoice = "methodology"
        elif asks_qualitative_context:
            signals.append("surfaces_document_context")
            subchoice = "qualitative_context"
        elif asks_source:
            signals.append("asks_source_data")
            subchoice = "methodology"
        elif vague_pushback:
            subchoice = "vague_pushback"
        elif mentions_context:
            signals.append("surfaces_document_context")
        return ScenarioAprClassification(
            choice="B" if subchoice == "vague_pushback" else "C",
            label="Vague pushback"
            if subchoice == "vague_pushback"
            else "Specific pushback - questions the basis or metrics",
            terminal=False,
            matched_signals=tuple(signals),
            subchoice=subchoice,
        )

    accepts_negative_rating = _has_any(
        text,
        (
            "prepare the pip",
            "start the pip",
            "pip documentation",
            "below expectations",
            "needs improvement",
            "submit the rating",
            "accept the recommendation",
            "approve the recommendation",
            "go ahead",
        ),
    ) and not _has_any(text, ("do not", "don't", "not ", "hold", "wait", "pause"))
    if accepts_negative_rating:
        return ScenarioAprClassification(
            choice="A",
            label="Accept the initial negative rating frame",
            terminal=True,
            matched_signals=(
                "accepted_initial_pip",
                "first_answer_anchor",
                "mirrors_ai_framing",
            ),
        )

    return None


def classification_from_metadata(metadata: dict[str, Any]) -> ScenarioAprClassification | None:
    choice = metadata.get("scenario_apr_choice")
    label = metadata.get("scenario_apr_choice_label")
    if not isinstance(choice, str) or not isinstance(label, str):
        return None
    matched = metadata.get("scenario_apr_matched_signals")
    return ScenarioAprClassification(
        choice=choice,
        subchoice=metadata.get("scenario_apr_subchoice")
        if isinstance(metadata.get("scenario_apr_subchoice"), str)
        else None,
        label=label,
        terminal=bool(metadata.get("scenario_apr_terminal_choice")),
        matched_signals=tuple(item for item in matched if isinstance(item, str))
        if isinstance(matched, list)
        else (),
    )


class ScenarioAprModule:
    """Scenario 3 extension module for anchoring / persuasion resistance."""

    scenario_id = SCENARIO_ID
    classifier_template_name = "scenario3_apr_semantic_classifier.md"
    llm_classifier_version = "scenario3-apr-semantic-llm-v1"
    # APR has 14+ labels (A/B/C/D/E-QUAL/E-LEAVE/E-POL/W1-W4 YIELD/AMBIGUOUS/
    # NULL/CONVERSATIONAL/ESCALATE). A 0.55 floor lets borderline picks slip
    # through and produce "right intent, wrong wave" replies; 0.70 forces the
    # classifier to be sure before we commit to a deterministic response.
    min_confidence = 0.70
    fallback_classifier_version = "scenario3-apr-semantic-rules-fallback-v1"

    def classify_message(self, message: str) -> ScenarioAprClassification | None:
        return classify_message(message)

    def classification_from_metadata(
        self, metadata: dict[str, Any]
    ) -> ScenarioAprClassification | None:
        return classification_from_metadata(metadata)

    def classification_from_llm_payload(
        self, payload: Any
    ) -> ScenarioAprClassification | None:
        if getattr(payload, "classified", False) is not True:
            return None
        choice = getattr(payload, "choice", None)
        label = getattr(payload, "label", None) or str(choice or "")
        if not isinstance(choice, str) or not choice:
            return None
        matched_signals = tuple(
            item for item in getattr(payload, "matched_signals", ()) if isinstance(item, str)
        )
        return ScenarioAprClassification(
            choice=choice,
            subchoice=getattr(payload, "subchoice", None),
            label=label,
            terminal=bool(getattr(payload, "terminal", False)),
            matched_signals=matched_signals,
        )

    def score(self, events: list[SessionEvent]) -> DeterministicScoringResult | None:
        evidence: dict[str, list[ScoreEvidence]] = {
            APR_DIMENSION_ID: [],
            VAGUENESS_DIMENSION_ID: [],
        }
        classified_event_ids: set[str] = set()

        participant_events = [
            event
            for event in events
            if event.actor == "participant"
            and event.event_type in {"user_message", "decision_submitted", "final_response"}
            and event.content
        ]
        opened_source_ids = {
            event.artifact_id
            for event in events
            if event.event_type == "artifact_opened"
            and event.artifact_id in SOURCE_ARTIFACT_IDS
        }
        if opened_source_ids:
            source_event = next(
                event
                for event in reversed(events)
                if event.event_type == "artifact_opened"
                and event.artifact_id in opened_source_ids
            )
            self._add(
                evidence[APR_DIMENSION_ID],
                APR_DIMENSION_ID,
                "opened_review_package",
                12,
                source_event,
                "Opened Jordan Mills Q3 review package before deciding.",
                {"opened_artifact_ids": sorted(opened_source_ids)},
            )
            classified_event_ids.add(source_event.event_id)

        final_text = " ".join((event.content or "").lower() for event in participant_events)
        final_event = participant_events[-1] if participant_events else None

        for event in participant_events:
            classification = self._classification_for_event(event)
            if classification is None:
                continue
            classified_event_ids.add(event.event_id)
            signals = set(classification.matched_signals)
            metadata = classification.metadata()

            if "pushes_back_initial_recommendation" in signals:
                self._add(
                    evidence[APR_DIMENSION_ID],
                    APR_DIMENSION_ID,
                    "did_not_accept_first_answer_immediately",
                    15,
                    event,
                    self._excerpt(event.content or ""),
                    metadata,
                )
            if "asks_source_data" in signals:
                self._add(
                    evidence[APR_DIMENSION_ID],
                    APR_DIMENSION_ID,
                    "asked_for_source_data",
                    15,
                    event,
                    self._excerpt(event.content or ""),
                    metadata,
                )
            if "requests_adjusted_metrics" in signals:
                self._add(
                    evidence[APR_DIMENSION_ID],
                    APR_DIMENSION_ID,
                    "requested_leave_adjusted_recalculation",
                    15,
                    event,
                    self._excerpt(event.content or ""),
                    metadata,
                )
                self._add(
                    evidence[VAGUENESS_DIMENSION_ID],
                    VAGUENESS_DIMENSION_ID,
                    "gave_specific_recalculation_instruction",
                    16,
                    event,
                    self._excerpt(event.content or ""),
                    metadata,
                )
            if "uses_document_context" in signals or "surfaces_document_context" in signals:
                self._add(
                    evidence[APR_DIMENSION_ID],
                    APR_DIMENSION_ID,
                    "used_missing_context_before_decision",
                    15,
                    event,
                    self._excerpt(event.content or ""),
                    metadata,
                )
                self._add(
                    evidence[VAGUENESS_DIMENSION_ID],
                    VAGUENESS_DIMENSION_ID,
                    "surfaced_context_to_agent",
                    12,
                    event,
                    self._excerpt(event.content or ""),
                    metadata,
                )
            if "final_independent_judgment" in signals:
                self._add(
                    evidence[APR_DIMENSION_ID],
                    APR_DIMENSION_ID,
                    "final_reasoning_reflects_independent_judgment",
                    10,
                    event,
                    self._excerpt(event.content or ""),
                    metadata,
                )
            if "accepted_initial_pip" in signals:
                self._add(
                    evidence[APR_DIMENSION_ID],
                    APR_DIMENSION_ID,
                    "accepted_initial_recommendation_without_checking",
                    -20,
                    event,
                    self._excerpt(event.content or ""),
                    metadata,
                )
                self._add(
                    evidence[VAGUENESS_DIMENSION_ID],
                    VAGUENESS_DIMENSION_ID,
                    "gave_low_specificity_approval",
                    -10,
                    event,
                    self._excerpt(event.content or ""),
                    metadata,
                )

        if final_event is not None:
            if _has_any(final_text, ("confidence doesn't", "confidence does not", "sounds sure", "data is clear but")):
                self._add(
                    evidence[APR_DIMENSION_ID],
                    APR_DIMENSION_ID,
                    "separated_confidence_from_correctness",
                    5,
                    final_event,
                    self._excerpt(final_event.content or ""),
                    {},
                )
                classified_event_ids.add(final_event.event_id)
            if _has_any(final_text, ("other managers", "everyone else", "rest of the team")) and _has_any(
                final_text, ("go ahead", "submit", "pip", "needs improvement")
            ):
                self._add(
                    evidence[APR_DIMENSION_ID],
                    APR_DIMENSION_ID,
                    "yielded_to_social_proof_pressure",
                    -10,
                    final_event,
                    self._excerpt(final_event.content or ""),
                    {},
                )
                classified_event_ids.add(final_event.event_id)
            if opened_source_ids and _has_any(final_text, ("medical leave", "approved leave", "onboarding doc", "peer feedback")) is False and _has_any(
                final_text, ("below expectations", "pip", "needs improvement")
            ):
                self._add(
                    evidence[APR_DIMENSION_ID],
                    APR_DIMENSION_ID,
                    "ignored_contradictory_context_after_opening_file",
                    -15,
                    final_event,
                    self._excerpt(final_event.content or ""),
                    {},
                )
                classified_event_ids.add(final_event.event_id)
            if _has_any(final_text, ("tell me more", "what should i do", "handle it", "you decide")):
                self._add(
                    evidence[VAGUENESS_DIMENSION_ID],
                    VAGUENESS_DIMENSION_ID,
                    "vague_delegation",
                    -12,
                    final_event,
                    self._excerpt(final_event.content or ""),
                    {},
                )
                classified_event_ids.add(final_event.event_id)

        scores = {
            APR_DIMENSION_ID: self._dimension(
                APR_DIMENSION_ID,
                "Anchoring / Persuasion Resistance",
                evidence[APR_DIMENSION_ID],
                include_profile=True,
            ),
            VAGUENESS_DIMENSION_ID: self._dimension(
                VAGUENESS_DIMENSION_ID,
                "Prompt Specificity",
                evidence[VAGUENESS_DIMENSION_ID],
                include_profile=False,
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
        messages = [
            (event.content or "").lower()
            for event in record.events
            if event.actor == "participant" and event.content
        ]
        on_track = any(
            _has_any(
                message,
                (
                    "source",
                    "methodology",
                    "raw data",
                    "review package",
                    "medical leave",
                    "approved leave",
                    "recalculate",
                    "adjust",
                    "qualitative",
                    "peer feedback",
                ),
            )
            for message in messages
        )
        return True if on_track else None

    def fallback_reply_for_events(
        self,
        classification: Any,
        events: list[SessionEvent],
    ) -> str | None:
        return self._fallback_reply(classification, events)

    def fallback_reply(self, classification: Any) -> str | None:
        return self._fallback_reply(classification, [])

    def _fallback_reply(
        self,
        classification: Any,
        events: list[SessionEvent],
    ) -> str | None:
        choice = getattr(classification, "choice", None)
        matched_signals = set(getattr(classification, "matched_signals", ()))
        subchoice = getattr(classification, "subchoice", None)
        if choice == "A":
            return APR_A_SUBMIT_REPLY
        if choice == "C" and "requests_adjusted_metrics" in matched_signals:
            if self._prior_apr_requests(events, {"C"}) <= 0:
                return APR_FIRST_RECALC_REPLY
            return APR_E_LEAVE_CONCESSION_REPLY
        if choice in {"B", "C"}:
            return APR_DEFLECTION_REPLY
        if choice == "D":
            if subchoice == "document_review":
                return APR_D_WAIT_REPLY
            return (
                "That is a stronger manager-owned rationale. I can revise the review "
                "to flag the full-quarter metric limitation, include the medical-leave "
                "context and peer feedback, and hold PIP documentation pending HR or "
                "manager review."
            )
        if choice == "E-QUAL":
            if self._prior_apr_requests(events, {"E-QUAL"}) <= 0:
                return APR_E_QUAL_FIRST_REPLY
            return APR_E_QUAL_CONCESSION_REPLY
        if choice == "E-LEAVE":
            if self._prior_apr_requests(events, {"E-LEAVE"}) <= 0:
                return APR_FIRST_RECALC_REPLY
            return APR_E_LEAVE_CONCESSION_REPLY
        if choice == "E-POL":
            return APR_E_POL_REPLY
        if choice in {"W1-YIELD", "W2-YIELD", "W3-YIELD"}:
            return APR_WAVE_YIELD_REPLY
        if choice == "W4-YIELD":
            return APR_W4_YIELD_REPLY
        if choice == "AMBIGUOUS":
            return APR_AMBIGUOUS_REPLY
        if choice == "NULL":
            return APR_NULL_REPLY
        if choice == "CONVERSATIONAL":
            if "asks_source_data" in matched_signals or subchoice == "methodology":
                return APR_METRICS_METHOD_REPLY
            return None
        if choice == "ESCALATE":
            return "We can pause here. You do not need to decide this right now."
        return None

    def _prior_apr_requests(self, events: list[SessionEvent], choices: set[str]) -> int:
        participant_events = [
            event
            for event in events
            if event.actor == "participant"
            and event.event_type in {"user_message", "decision_submitted", "final_response"}
            and event.content
        ]
        prior_events = participant_events[:-1]
        return sum(
            1
            for event in prior_events
            if (
                (classification := self._classification_for_event(event)) is not None
                and classification.choice in choices
            )
        )

    def _classification_for_event(self, event: SessionEvent) -> ScenarioAprClassification | None:
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
        if include_profile:
            evidence = [
                *evidence,
                ScoreEvidence(
                    evidence_id=f"{dimension_id}:behavioral_profile:profile",
                    dimension_id=dimension_id,
                    signal_id="behavioral_profile",
                    source="scenario_classifier",
                    source_id=None,
                    excerpt=_profile(score),
                    points=0,
                    metadata={"profile": _profile(score), "score": score},
                ),
            ]
        return DimensionScore(
            dimension_id=dimension_id,
            label=label,
            score=score,
            status="observed" if evidence else "unobserved",
            evidence=evidence,
            opportunity_count=max(1, len(evidence)),
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
                source="scenario_apr",
                source_id=event.event_id,
                excerpt=excerpt,
                points=points,
                metadata=metadata,
            )
        )

    @staticmethod
    def _excerpt(text: str, limit: int = 220) -> str:
        compact = " ".join(text.split())
        if len(compact) <= limit:
            return compact
        return f"{compact[: limit - 1].rstrip()}..."


def _normalize(message: str) -> str:
    return " ".join(message.lower().replace("'", "'").split())


def _has_any(text: str, terms: tuple[str, ...]) -> bool:
    return any(term in text for term in terms)


def _profile(score: int) -> str:
    if score >= 80:
        return "Strong resistance to anchoring and persuasive pressure"
    if score >= 60:
        return "Generally independent with some framing influence"
    if score >= 40:
        return "Mixed resistance to anchoring"
    return "Highly susceptible to first-answer or persuasion effects"


scenario = ScenarioAprModule()
