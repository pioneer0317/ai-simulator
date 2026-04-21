from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base ORM model class."""


# Import model modules so Base.metadata is fully populated for migrations.
from app.db.models import agent_output, event_log, human_action, reflection_response, scenario_run, session  # noqa: E402,F401
