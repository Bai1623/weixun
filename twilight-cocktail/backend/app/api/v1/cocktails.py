from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.cocktails import get_cocktail_by_slug, list_cocktails
from app.schemas.cocktail import CocktailListResponse, CocktailResponse, cocktail_to_response

router = APIRouter(prefix="/cocktails", tags=["cocktails"])
DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=CocktailListResponse)
def get_cocktails(
    db: DbSession,
    search: str | None = None,
    difficulty: str | None = None,
    baseSpirit: Annotated[str | None, Query()] = None,
    isAlcoholic: Annotated[bool | None, Query()] = None,
    beginnerFriendly: Annotated[bool | None, Query()] = None,
) -> CocktailListResponse:
    cocktails, total = list_cocktails(
        db,
        search=search,
        difficulty=difficulty,
        base_spirit=baseSpirit,
        is_alcoholic=isAlcoholic,
        beginner_friendly=beginnerFriendly,
    )
    return CocktailListResponse(
        items=[cocktail_to_response(cocktail) for cocktail in cocktails],
        total=total,
    )


@router.get("/{slug}", response_model=CocktailResponse)
def get_cocktail(slug: str, db: DbSession) -> CocktailResponse:
    cocktail = get_cocktail_by_slug(db, slug)
    if cocktail is None:
        raise HTTPException(status_code=404, detail="Cocktail not found")
    return cocktail_to_response(cocktail)
