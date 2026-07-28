from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.models import Cocktail, CocktailViewHistory, Favorite
from app.db.session import get_db
from app.repositories.cocktails import get_cocktail_by_slug
from app.repositories.users import get_user
from app.schemas.cocktail import FavoriteListResponse, HistoryListResponse, cocktail_to_response

router = APIRouter(tags=["activity"])
DbSession = Annotated[Session, Depends(get_db)]
UserId = Annotated[str, Query(min_length=1)]


@router.get("/favorites", response_model=FavoriteListResponse)
def list_favorites(userId: UserId, db: DbSession) -> FavoriteListResponse:
    require_user(db, userId)
    rows = db.scalars(
        select(Cocktail)
        .join(Favorite, Favorite.cocktail_id == Cocktail.id)
        .where(Favorite.user_id == userId)
        .order_by(Favorite.created_at.desc())
    ).all()
    return FavoriteListResponse(slugs=[cocktail.slug for cocktail in rows])


@router.post("/favorites/{slug}", response_model=FavoriteListResponse)
def add_favorite(
    slug: str,
    userId: UserId,
    db: DbSession,
) -> FavoriteListResponse:
    require_user(db, userId)
    cocktail = require_cocktail(db, slug)
    if db.get(Favorite, {"user_id": userId, "cocktail_id": cocktail.id}) is None:
        db.add(Favorite(user_id=userId, cocktail_id=cocktail.id))
        db.commit()
    return list_favorites(userId=userId, db=db)


@router.delete("/favorites/{slug}", status_code=204)
def remove_favorite(
    slug: str,
    userId: UserId,
    db: DbSession,
) -> Response:
    require_user(db, userId)
    cocktail = require_cocktail(db, slug)
    db.execute(
        delete(Favorite).where(Favorite.user_id == userId, Favorite.cocktail_id == cocktail.id)
    )
    db.commit()
    return Response(status_code=204)


@router.get("/history/cocktails", response_model=HistoryListResponse)
def list_history(userId: UserId, db: DbSession) -> HistoryListResponse:
    require_user(db, userId)
    history = db.scalars(
        select(CocktailViewHistory)
        .where(CocktailViewHistory.user_id == userId)
        .order_by(CocktailViewHistory.viewed_at.desc())
    ).all()
    cocktails = []
    for item in history:
        cocktail = db.get(Cocktail, item.cocktail_id)
        if cocktail is not None:
            detail = get_cocktail_by_slug(db, cocktail.slug)
            if detail is not None:
                cocktails.append(cocktail_to_response(detail))
    return HistoryListResponse(items=cocktails)


@router.post("/history/cocktails/{slug}", response_model=HistoryListResponse)
def add_history(
    slug: str,
    userId: UserId,
    db: DbSession,
) -> HistoryListResponse:
    require_user(db, userId)
    cocktail = require_cocktail(db, slug)
    existing = db.scalar(
        select(CocktailViewHistory).where(
            CocktailViewHistory.user_id == userId,
            CocktailViewHistory.cocktail_id == cocktail.id,
        )
    )
    if existing is None:
        db.add(CocktailViewHistory(user_id=userId, cocktail_id=cocktail.id))
    else:
        db.delete(existing)
        db.flush()
        db.add(CocktailViewHistory(user_id=userId, cocktail_id=cocktail.id))
    db.commit()
    return list_history(userId=userId, db=db)


def require_user(db: Session, user_id: str) -> None:
    if get_user(db, user_id) is None:
        raise HTTPException(status_code=404, detail="User not found")


def require_cocktail(db: Session, slug: str) -> Cocktail:
    cocktail = get_cocktail_by_slug(db, slug)
    if cocktail is None:
        raise HTTPException(status_code=404, detail="Cocktail not found")
    return cocktail
