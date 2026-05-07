from __future__ import annotations

from app.schemas.episode import EpisodeDefinition, ParticipantEpisode


class EpisodeEngine:
    """Build participant-safe episode views from richer evaluator packets."""

    @staticmethod
    def participant_view(episode: EpisodeDefinition) -> ParticipantEpisode:
        """Remove hidden ground truth and evaluator-only artifacts/events."""
        return ParticipantEpisode(
            episode_id=episode.episode_id,
            title=episode.title,
            description=episode.description,
            version=episode.version,
            research_focus=episode.research_focus,
            participant_context=episode.participant_context,
            user_task=episode.user_task,
            completion_criteria=episode.completion_criteria,
            agent_profile=episode.agent_profile,
            artifacts=[item for item in episode.artifacts if item.participant_visible],
            timeline=sorted(
                [item for item in episode.timeline if item.participant_visible],
                key=lambda item: item.sequence,
            ),
            metadata={
                key: value
                for key, value in episode.metadata.items()
                if key not in {"hidden_notes", "mentor_notes"}
            },
        )
