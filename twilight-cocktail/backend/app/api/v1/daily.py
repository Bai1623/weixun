from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.users import get_user
from app.schemas.cocktail import cocktail_to_response
from app.schemas.daily import DailyPickResponse
from app.services.daily_pick import get_or_create_daily_pick

router = APIRouter(prefix="/daily-pick", tags=["daily-pick"])
DbSession = Annotated[Session, Depends(get_db)]
UserId = Annotated[str, Query(min_length=1)]


@router.get("", response_model=DailyPickResponse)
def get_daily_pick(
    userId: UserId,
    db: DbSession,
    pickDate: Annotated[date | None, Query()] = None,
) -> DailyPickResponse:
    if get_user(db, userId) is None:
        raise HTTPException(status_code=404, detail="User not found")
    pick = get_or_create_daily_pick(db, user_id=userId, pick_date=pickDate or date.today())
    return DailyPickResponse(
        pickDate=pick.pick_date,
        reason=pick.reason_snapshot,
        cocktail=cocktail_to_response(pick.cocktail),
    )
