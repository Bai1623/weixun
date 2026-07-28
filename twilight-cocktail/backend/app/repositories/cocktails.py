from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, selectinload

from app.db.models import Cocktail, CocktailIngredient


def cocktail_detail_options() -> tuple[Any, ...]:
    return (
        selectinload(Cocktail.ingredients).selectinload(CocktailIngredient.ingredient),
        selectinload(Cocktail.steps),
    )


def list_cocktails(
    db: Session,
    *,
    search: str | None = None,
    difficulty: str | None = None,
    base_spirit: str | None = None,
    is_alcoholic: bool | None = None,
    beginner_friendly: bool | None = None,
) -> tuple[list[Cocktail], int]:
    stmt: Select[tuple[Cocktail]] = select(Cocktail).where(Cocktail.is_active.is_(True))
    count_stmt = select(func.count(Cocktail.id)).where(Cocktail.is_active.is_(True))

    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(Cocktail.name_zh.like(pattern) | Cocktail.name_en.like(pattern))
        count_stmt = count_stmt.where(
            Cocktail.name_zh.like(pattern) | Cocktail.name_en.like(pattern)
        )
    if difficulty:
        stmt = stmt.where(Cocktail.difficulty == difficulty)
        count_stmt = count_stmt.where(Cocktail.difficulty == difficulty)
    if base_spirit:
        stmt = stmt.where(Cocktail.base_spirit == base_spirit)
        count_stmt = count_stmt.where(Cocktail.base_spirit == base_spirit)
    if is_alcoholic is not None:
        stmt = stmt.where(Cocktail.is_alcoholic.is_(is_alcoholic))
        count_stmt = count_stmt.where(Cocktail.is_alcoholic.is_(is_alcoholic))
    if beginner_friendly is not None:
        stmt = stmt.where(Cocktail.beginner_friendly.is_(beginner_friendly))
        count_stmt = count_stmt.where(Cocktail.beginner_friendly.is_(beginner_friendly))

    stmt = stmt.options(*cocktail_detail_options()).order_by(
        Cocktail.popularity_weight.desc(),
        Cocktail.name_en.asc(),
    )
    return list(db.scalars(stmt).all()), db.scalar(count_stmt) or 0


def get_cocktail_by_slug(db: Session, slug: str) -> Cocktail | None:
    stmt = (
        select(Cocktail)
        .options(*cocktail_detail_options())
        .where(Cocktail.slug == slug, Cocktail.is_active.is_(True))
    )
    return db.scalar(stmt)
