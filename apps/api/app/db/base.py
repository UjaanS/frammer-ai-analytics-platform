from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import model modules here so Alembic can discover every table from
# Base.metadata without requiring application routes to import them first.
from apps.api.app.models import analytics as analytics_models  # noqa: E402,F401
