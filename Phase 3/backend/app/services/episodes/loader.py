from __future__ import annotations

from pathlib import Path

import yaml

from app.schemas.episode import EpisodeCatalogEntry, EpisodeDefinition


class EpisodeNotFoundError(KeyError):
    """Raised when an episode id is not present in the loaded catalog."""


class EpisodeLoader:
    """Load simulator episode packets from YAML files."""

    def __init__(self, episode_dir: Path) -> None:
        self._episode_dir = Path(episode_dir)
        self._episodes = self._load_all()

    def list_entries(self) -> list[EpisodeCatalogEntry]:
        """Return safe catalog summaries sorted by episode title."""
        entries = [
            EpisodeCatalogEntry(
                episode_id=episode.episode_id,
                title=episode.title,
                description=episode.description,
                version=episode.version,
                status=episode.status,
                scenario_number=episode.scenario_number,
                research_focus=episode.research_focus,
                artifact_count=len([item for item in episode.artifacts if item.participant_visible]),
                timeline_event_count=len(
                    [item for item in episode.timeline if item.participant_visible]
                ),
            )
            for episode in self._episodes.values()
        ]
        return sorted(
            entries,
            key=lambda entry: (
                entry.scenario_number if entry.scenario_number is not None else 10_000,
                entry.title,
            ),
        )

    def get(self, episode_id: str) -> EpisodeDefinition:
        """Return one full episode packet for backend/evaluator use."""
        try:
            return self._episodes[episode_id]
        except KeyError as exc:
            raise EpisodeNotFoundError(f"Episode '{episode_id}' was not found.") from exc

    def _load_all(self) -> dict[str, EpisodeDefinition]:
        if not self._episode_dir.exists():
            raise FileNotFoundError(f"Episode config directory was not found: {self._episode_dir}")

        episodes: dict[str, EpisodeDefinition] = {}
        for path in sorted(self._episode_dir.glob("*.yaml")):
            with path.open("r", encoding="utf-8") as episode_file:
                payload = yaml.safe_load(episode_file) or {}
            episode = EpisodeDefinition.model_validate(payload)
            if episode.episode_id in episodes:
                raise ValueError(f"Duplicate episode_id '{episode.episode_id}' in {path}.")
            episodes[episode.episode_id] = episode
        if not episodes:
            raise ValueError(f"No episode YAML files were found in {self._episode_dir}.")
        return episodes
