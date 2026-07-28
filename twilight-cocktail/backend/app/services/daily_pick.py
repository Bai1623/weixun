from datetime import date
from random import Random

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Cocktail, DailyPick
from app.repositories.cocktails import get_cocktail_by_slug


def get_or_create_daily_pick(db: Session, *, user_id: str, pick_date: date) -> DailyPick:
    existing = db.scalar(
        select(DailyPick).where(DailyPick.user_id == user_id, DailyPick.pick_date == pick_date)
    )
    if existing:
        return existing

    cocktails = list(
        db.scalars(
            select(Cocktail).where(Cocktail.is_active.is_(True)).order_by(Cocktail.slug.asc())
        ).all()
    )
    if not cocktails:
        raise ValueError("No active cocktails are available")

    rng = Random(f"{user_id}:{pick_date.isoformat()}")
    total_weight = sum(max(cocktail.popularity_weight, 0.1) for cocktail in cocktails)
    target = rng.uniform(0, total_weight)
    running = 0.0
    selected = cocktails[-1]
    for cocktail in cocktails:
        running += max(cocktail.popularity_weight, 0.1)
        if running >= target:
            selected = cocktail
            break

    pick = DailyPick(
        user_id=user_id,
        pick_date=pick_date,
        cocktail_id=selected.id,
        weight_snapshot=selected.popularity_weight,
        reason_snapshot=build_reason(selected),
    )
    db.add(pick)
    db.commit()
    db.refresh(pick)
    detail = get_cocktail_by_slug(db, selected.slug)
    if detail is not None:
        pick.cocktail = detail
    return pick


def build_reason(cocktail: Cocktail) -> str:
    if cocktail.beginner_friendly:
        return f"{cocktail.name_zh}适合今天从稳定比例开始练习。"
    return f"{cocktail.name_zh}适合今天挑战更有层次的风味。"
