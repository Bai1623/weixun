from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import User


def get_user(db: Session, user_id: str) -> User | None:
    return db.get(User, user_id)


def get_or_create_anonymous_user(
    db: Session,
    *,
    anonymous_key: str,
    display_name: str | None = None,
) -> User:
    existing = db.scalar(select(User).where(User.anonymous_key == anonymous_key))
    if existing:
        return existing

    user = User(
        anonymous_key=anonymous_key,
        display_name=display_name,
        is_anonymous=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
