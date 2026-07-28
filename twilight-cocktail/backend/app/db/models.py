from datetime import UTC, date, datetime
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def new_uuid() -> str:
    return str(uuid4())


def now_utc() -> datetime:
    return datetime.now(UTC)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    email: Mapped[str | None] = mapped_column(String(255), unique=True)
    display_name: Mapped[str | None] = mapped_column(String(80))
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    anonymous_key: Mapped[str | None] = mapped_column(String(100), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=now_utc,
        onupdate=now_utc,
        nullable=False,
    )


class Cocktail(Base):
    __tablename__ = "cocktails"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name_en: Mapped[str] = mapped_column(String(160), nullable=False)
    name_zh: Mapped[str] = mapped_column(String(160), nullable=False)
    slug: Mapped[str] = mapped_column(String(180), nullable=False, unique=True, index=True)
    short_description: Mapped[str] = mapped_column(String(300), nullable=False)
    story: Mapped[str] = mapped_column(Text, default="", nullable=False)
    image_url: Mapped[str] = mapped_column(Text, default="", nullable=False)
    image_tone: Mapped[str] = mapped_column(String(40), default="amber", nullable=False)
    base_spirit: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    glass_type: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    method: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    difficulty: Mapped[str] = mapped_column(String(30), default="easy", nullable=False)
    prep_minutes: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    alcohol_level: Mapped[str] = mapped_column(String(30), default="medium", nullable=False)
    flavor_sweet: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    flavor_sour: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    flavor_bitter: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    flavor_strong: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    flavor_fresh: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tags: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    popularity_weight: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    beginner_friendly: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_iba: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_alcoholic: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    review_status: Mapped[str] = mapped_column(String(30), default="trusted", nullable=False)
    source_name: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=now_utc,
        onupdate=now_utc,
        nullable=False,
    )

    ingredients: Mapped[list["CocktailIngredient"]] = relationship(
        back_populates="cocktail",
        cascade="all, delete-orphan",
        order_by="CocktailIngredient.display_order",
    )
    steps: Mapped[list["CocktailStep"]] = relationship(
        back_populates="cocktail", cascade="all, delete-orphan", order_by="CocktailStep.step_number"
    )


class Ingredient(Base):
    __tablename__ = "ingredients"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    slug: Mapped[str] = mapped_column(String(180), nullable=False, unique=True, index=True)
    name_en: Mapped[str] = mapped_column(String(160), nullable=False)
    name_zh: Mapped[str] = mapped_column(String(160), nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="other", nullable=False)
    is_household_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class CocktailIngredient(Base):
    __tablename__ = "cocktail_ingredients"
    __table_args__ = (UniqueConstraint("cocktail_id", "ingredient_id", "display_order"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    cocktail_id: Mapped[str] = mapped_column(ForeignKey("cocktails.id", ondelete="CASCADE"))
    ingredient_id: Mapped[str] = mapped_column(ForeignKey("ingredients.id", ondelete="RESTRICT"))
    amount: Mapped[str] = mapped_column(String(80), default="", nullable=False)
    requirement: Mapped[str] = mapped_column(String(30), default="required", nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    note: Mapped[str | None] = mapped_column(String(300))

    cocktail: Mapped[Cocktail] = relationship(back_populates="ingredients")
    ingredient: Mapped[Ingredient] = relationship()


class CocktailStep(Base):
    __tablename__ = "cocktail_steps"
    __table_args__ = (UniqueConstraint("cocktail_id", "step_number"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    cocktail_id: Mapped[str] = mapped_column(ForeignKey("cocktails.id", ondelete="CASCADE"))
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)
    instruction: Mapped[str] = mapped_column(Text, nullable=False)
    technique: Mapped[str] = mapped_column(String(80), default="", nullable=False)
    timer_seconds: Mapped[int | None] = mapped_column(Integer)
    tip: Mapped[str | None] = mapped_column(String(500))

    cocktail: Mapped[Cocktail] = relationship(back_populates="steps")


class DailyPick(Base):
    __tablename__ = "daily_picks"
    __table_args__ = (UniqueConstraint("user_id", "pick_date"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    pick_date: Mapped[date] = mapped_column(Date, nullable=False)
    cocktail_id: Mapped[str] = mapped_column(ForeignKey("cocktails.id", ondelete="RESTRICT"))
    weight_snapshot: Mapped[float | None] = mapped_column(Float)
    reason_snapshot: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, nullable=False)

    cocktail: Mapped[Cocktail] = relationship()


class Favorite(Base):
    __tablename__ = "favorites"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    cocktail_id: Mapped[str] = mapped_column(
        ForeignKey("cocktails.id", ondelete="CASCADE"), primary_key=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, nullable=False)


class CocktailViewHistory(Base):
    __tablename__ = "cocktail_view_history"
    __table_args__ = (UniqueConstraint("user_id", "cocktail_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    cocktail_id: Mapped[str] = mapped_column(ForeignKey("cocktails.id", ondelete="CASCADE"))
    viewed_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, nullable=False)
