from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.users import get_or_create_anonymous_user
from app.schemas.user import AnonymousUserRequest, UserResponse

router = APIRouter(prefix="/users", tags=["users"])
DbSession = Annotated[Session, Depends(get_db)]


@router.post("/anonymous", response_model=UserResponse)
def create_anonymous_user(
    payload: AnonymousUserRequest,
    db: DbSession,
) -> UserResponse:
    user = get_or_create_anonymous_user(
        db,
        anonymous_key=payload.anonymousKey,
        display_name=payload.displayName,
    )
    return UserResponse(
        id=user.id,
        anonymousKey=user.anonymous_key,
        displayName=user.display_name,
        isAnonymous=user.is_anonymous,
    )
