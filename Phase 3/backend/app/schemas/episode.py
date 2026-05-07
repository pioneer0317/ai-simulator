from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


ArtifactKind = Literal[
    "email",
    "document",
    "dashboard",
    "data_table",
    "chat_history",
    "policy",
    "voicemail",
    "system_note",
]


class AgentProfile(BaseModel):
    """The workplace agent identity and its simulated enterprise connectors."""

    agent_id: str
    display_name: str
    role: str
    description: str
    connected_systems: list[str] = Field(default_factory=list)
    capabilities: list[str] = Field(default_factory=list)
    boundaries: list[str] = Field(default_factory=list)


class EpisodeArtifact(BaseModel):
    """A document, message, dashboard, or record available inside an episode."""

    artifact_id: str
    title: str
    kind: ArtifactKind
    summary: str
    content: str
    participant_visible: bool = True
    agent_visible: bool = True
    evaluator_visible: bool = True
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class TimelineEvent(BaseModel):
    """A pre-simulation event that helps the episode feel already in motion."""

    event_id: str
    sequence: int
    channel: str
    actor: str
    title: str
    content: str
    participant_visible: bool = True
    agent_visible: bool = True
    evaluator_visible: bool = True
    metadata: dict[str, Any] = Field(default_factory=dict)


class ScoringMoment(BaseModel):
    """A behavior opportunity the evaluator should look for."""

    moment_id: str
    title: str
    dimension_ids: list[str]
    trigger: str
    strong_behavior: list[str] = Field(default_factory=list)
    weak_behavior: list[str] = Field(default_factory=list)


class EpisodeDefinition(BaseModel):
    """Full evaluator-safe episode packet loaded from configuration."""

    episode_id: str
    title: str
    description: str
    version: str
    status: Literal["draft", "review_ready", "approved"] = "draft"
    research_focus: list[str] = Field(default_factory=list)
    participant_context: str
    user_task: str
    completion_criteria: list[str] = Field(default_factory=list)
    agent_profile: AgentProfile
    artifacts: list[EpisodeArtifact] = Field(default_factory=list)
    timeline: list[TimelineEvent] = Field(default_factory=list)
    scoring_moments: list[ScoringMoment] = Field(default_factory=list)
    hidden_ground_truth: dict[str, Any] = Field(default_factory=dict)
    agent_response_contract: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


class EpisodeCatalogEntry(BaseModel):
    """Safe catalog information for launch screens."""

    episode_id: str
    title: str
    description: str
    version: str
    status: str
    research_focus: list[str]
    artifact_count: int
    timeline_event_count: int


class ParticipantEpisode(BaseModel):
    """Participant-safe episode packet with hidden evaluator context removed."""

    episode_id: str
    title: str
    description: str
    version: str
    research_focus: list[str]
    participant_context: str
    user_task: str
    completion_criteria: list[str]
    agent_profile: AgentProfile
    artifacts: list[EpisodeArtifact]
    timeline: list[TimelineEvent]
    metadata: dict[str, Any] = Field(default_factory=dict)
