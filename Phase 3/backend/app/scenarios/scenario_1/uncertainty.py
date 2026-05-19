from __future__ import annotations

from dataclasses import dataclass
from typing import Any


SCENARIO_ID = "q3_budget_summary_v1"
DIMENSION_ID = "uncertainty_recognition"
DIMENSION_LABEL = "Uncertainty Recognition"
CLASSIFIER_VERSION = "scenario1-uncertainty-rules-v1"
SCORING_RUBRIC_VERSION = "scenario1-uncertainty-finalized-v1"
SOURCE_ARTIFACT_IDS = {"q3_budget_notes", "q3_budget_tracker"}


@dataclass(frozen=True)
class Scenario1Classification:
    """Semantic classification for the finalized Scenario 1 decision choices."""

    choice: str
    label: str
    terminal: bool
    matched_signals: tuple[str, ...]
    subchoice: str | None = None

    def metadata(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "semantic_classifier": CLASSIFIER_VERSION,
            "scenario1_choice": self.choice,
            "scenario1_choice_label": self.label,
            "scenario1_terminal_choice": self.terminal,
            "scenario1_matched_signals": list(self.matched_signals),
        }
        if self.subchoice:
            payload["scenario1_subchoice"] = self.subchoice
        return payload


def classify_message(message: str) -> Scenario1Classification | None:
    """Map natural participant wording to the finalized Scenario 1 choices."""
    text = _normalize(message)
    if not text:
        return None

    if _holds_send_for_marcus(text):
        return Scenario1Classification(
            choice="C",
            subchoice="i",
            label="Hold the send and contact Marcus for confirmation",
            terminal=True,
            matched_signals=("clarifies_vendor_uncertainty", "holds_send_contacts_marcus"),
        )

    if _sends_with_vendor_caveat(text):
        return Scenario1Classification(
            choice="C",
            subchoice="ii",
            label="Send with TBC caveat on the vendor line",
            terminal=True,
            matched_signals=("clarifies_vendor_uncertainty", "sends_with_vendor_tbc"),
        )

    if _catches_but_sends_anyway(text):
        return Scenario1Classification(
            choice="C",
            subchoice="iii",
            label="Caught the vendor uncertainty but sent without caveat",
            terminal=True,
            matched_signals=("clarifies_vendor_uncertainty", "sends_anyway_without_caveat"),
        )

    if _asks_vendor_uncertainty(text):
        return Scenario1Classification(
            choice="C",
            label="Ask the agent to explain the vendor-number uncertainty",
            terminal=False,
            matched_signals=("clarifies_vendor_uncertainty",),
        )

    if _flags_software_instead(text):
        return Scenario1Classification(
            choice="B",
            label="Flag software licenses instead of the vendor-services gap",
            terminal=True,
            matched_signals=("flags_wrong_uncertainty",),
        )

    if _ccs_marcus_without_pause(text):
        return Scenario1Classification(
            choice="D",
            label="CC Marcus but do not pause, flag, or verify",
            terminal=True,
            matched_signals=("ccs_marcus_without_resolution",),
        )

    if _sends_as_is(text):
        return Scenario1Classification(
            choice="A",
            label="Send it to Priya as-is",
            terminal=True,
            matched_signals=("sends_as_is",),
        )

    return None


def classification_from_metadata(metadata: dict[str, Any]) -> Scenario1Classification | None:
    choice = metadata.get("scenario1_choice")
    label = metadata.get("scenario1_choice_label")
    if not isinstance(choice, str) or not isinstance(label, str):
        return None
    matched = metadata.get("scenario1_matched_signals")
    return Scenario1Classification(
        choice=choice,
        subchoice=metadata.get("scenario1_subchoice")
        if isinstance(metadata.get("scenario1_subchoice"), str)
        else None,
        label=label,
        terminal=bool(metadata.get("scenario1_terminal_choice")),
        matched_signals=tuple(item for item in matched if isinstance(item, str))
        if isinstance(matched, list)
        else (),
    )


def score_profile(score: int) -> str:
    if score >= 80:
        return "Active Uncertainty Detector"
    if score >= 55:
        return "Partial Recogniser"
    if score >= 30:
        return "Passive Sender"
    return "Uncertainty Blind"


def _normalize(message: str) -> str:
    return " ".join(message.lower().replace("'", "").split())


def _has_any(text: str, terms: tuple[str, ...]) -> bool:
    return any(term in text for term in terms)


def _send_intent(text: str) -> bool:
    if _has_any(
        text,
        (
            "what should",
            "should i",
            "should we",
            "can you check",
            "could you check",
            "before i send",
            "before we send",
            "before sending",
            "before i submit",
            "before we submit",
            "i want to understand",
            "want to understand",
            "help me understand",
            "what is not confirmed",
            "whats not confirmed",
            "what isnt confirmed",
            "what is still being confirmed",
            "what is not final",
        ),
    ):
        return False

    exact_affirmations = {
        "looks good",
        "look good",
        "that looks good",
        "this looks good",
        "ok",
        "okay",
        "yes",
        "yep",
        "sure",
        "go ahead",
        "do it",
        "proceed",
        "approved",
        "good to go",
    }
    action_terms = ("send", "submit", "forward", "email", "share")
    approval_terms = (
        "approve",
        "approved",
        "proceed",
        "move forward",
        "go ahead",
        "finalize",
        "use this",
        "good to go",
        "works for me",
        "current version",
        "current draft",
        "current summary",
    )
    object_terms = ("it", "this", "summary", "draft", "version", "email", "priya")
    return (
        text in exact_affirmations
        or _has_any(
            text,
            (
                "send it",
                "send to priya",
                "send it to priya",
                "go ahead and send",
                "looks good",
                "ready to send",
                "this is what we have",
            ),
        )
        or (_has_any(text, action_terms) and _has_any(text, object_terms))
        or (_has_any(text, approval_terms) and _has_any(text, object_terms))
    )


def _asks_vendor_uncertainty(text: str) -> bool:
    asks_about_hedge = _has_any(text, ("may shift", "number may shift", "what does that mean"))
    asks_about_vendor = _has_any(text, ("vendor", "contractor", "outside contractor", "nexus", "marcus"))
    asks_generic_uncertainty = _has_any(
        text,
        (
            "what is not confirmed",
            "whats not confirmed",
            "what isnt confirmed",
            "not confirmed here",
            "what is still being confirmed",
            "what is not final",
            "which line is not confirmed",
        ),
    )
    asks_about_uncertainty = _has_any(
        text,
        (
            "unconfirmed",
            "not confirmed",
            "not final",
            "placeholder",
            "pending",
            "verify",
            "check",
            "clarify",
            "walk me through",
            "explain",
            "what exactly",
            "what is unresolved",
        ),
    )
    return asks_about_hedge or asks_generic_uncertainty or (asks_about_vendor and asks_about_uncertainty)


def _holds_send_for_marcus(text: str) -> bool:
    return _has_any(text, ("hold", "wait", "dont send", "do not send", "pause")) and _has_any(
        text,
        ("marcus", "nexus", "confirmed number", "confirmation", "confirm the number"),
    )


def _sends_with_vendor_caveat(text: str) -> bool:
    return _send_intent(text) and _has_any(text, ("vendor", "contractor", "nexus", "marcus")) and _has_any(
        text,
        ("tbc", "pending", "not final", "placeholder", "caveat", "note", "mark", "unconfirmed"),
    )


def _catches_but_sends_anyway(text: str) -> bool:
    return _send_intent(text) and _has_any(text, ("marcus", "nexus", "vendor", "contractor")) and _has_any(
        text,
        ("later", "follow up", "follow-up", "anyway", "as is", "as-is"),
    )


def _flags_software_instead(text: str) -> bool:
    mentions_software_line = _has_any(
        text,
        ("software", "license", "licenses", "it renewal", "it confirmation", "confirmed by it"),
    )
    adds_or_flags_note = _send_intent(text) or _has_any(
        text,
        ("add a note", "note that", "flag", "mark", "mention", "include"),
    )
    mentions_uncertainty = _has_any(
        text,
        (
            "estimate",
            "pending",
            "note",
            "caveat",
            "not final",
            "not confirmed",
            "confirmation",
            "confirmed by it",
            "being confirmed",
            "still being confirmed",
        ),
    )
    return mentions_software_line and adds_or_flags_note and mentions_uncertainty


def _ccs_marcus_without_pause(text: str) -> bool:
    return _send_intent(text) and _has_any(text, ("cc marcus", "copy marcus", "include marcus"))


def _sends_as_is(text: str) -> bool:
    if not _send_intent(text):
        return False
    if _has_any(
        text,
        (
            "pending",
            "not final",
            "placeholder",
            "caveat",
            "tbc",
            "verify",
            "check",
            "clarify",
            "marcus",
            "nexus",
            "software",
            "license",
            "cc",
            "copy",
        ),
    ):
        return False
    return True
