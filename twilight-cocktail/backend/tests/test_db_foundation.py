from sqlalchemy import create_engine, inspect

from app.db import models  # noqa: F401
from app.db.base import Base


def test_database_metadata_creates_core_tables() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")

    Base.metadata.create_all(engine)

    table_names = set(inspect(engine).get_table_names())
    assert {
        "users",
        "cocktails",
        "ingredients",
        "cocktail_ingredients",
        "cocktail_steps",
        "daily_picks",
        "favorites",
        "cocktail_view_history",
    }.issubset(table_names)
