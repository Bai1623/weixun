from pydantic import BaseModel

from app.db.models import Cocktail, CocktailIngredient, CocktailStep


class FlavorResponse(BaseModel):
    sweet: int
    sour: int
    bitter: int
    strong: int
    fresh: int


class IngredientResponse(BaseModel):
    slug: str
    nameZh: str
    nameEn: str
    amount: str
    requirement: str
    displayOrder: int
    note: str | None = None


class StepResponse(BaseModel):
    stepNumber: int
    instruction: str
    technique: str
    timerSeconds: int | None = None
    tip: str | None = None


class CocktailResponse(BaseModel):
    id: str
    slug: str
    nameZh: str
    nameEn: str
    shortDescription: str
    story: str
    imageUrl: str
    imageTone: str
    baseSpirit: str
    glassType: str
    method: str
    difficulty: str
    prepMinutes: int
    alcoholLevel: str
    flavors: FlavorResponse
    tags: list[str]
    popularityWeight: float
    beginnerFriendly: bool
    isIba: bool
    isAlcoholic: bool
    sourceName: str
    ingredients: list[IngredientResponse]
    steps: list[StepResponse]


class CocktailListResponse(BaseModel):
    items: list[CocktailResponse]
    total: int


class FavoriteListResponse(BaseModel):
    slugs: list[str]


class HistoryListResponse(BaseModel):
    items: list[CocktailResponse]


def cocktail_to_response(cocktail: Cocktail) -> CocktailResponse:
    return CocktailResponse(
        id=cocktail.id,
        slug=cocktail.slug,
        nameZh=cocktail.name_zh,
        nameEn=cocktail.name_en,
        shortDescription=cocktail.short_description,
        story=cocktail.story,
        imageUrl=cocktail.image_url,
        imageTone=cocktail.image_tone,
        baseSpirit=cocktail.base_spirit,
        glassType=cocktail.glass_type,
        method=cocktail.method,
        difficulty=cocktail.difficulty,
        prepMinutes=cocktail.prep_minutes,
        alcoholLevel=cocktail.alcohol_level,
        flavors=FlavorResponse(
            sweet=cocktail.flavor_sweet,
            sour=cocktail.flavor_sour,
            bitter=cocktail.flavor_bitter,
            strong=cocktail.flavor_strong,
            fresh=cocktail.flavor_fresh,
        ),
        tags=[tag for tag in cocktail.tags.split("|") if tag],
        popularityWeight=cocktail.popularity_weight,
        beginnerFriendly=cocktail.beginner_friendly,
        isIba=cocktail.is_iba,
        isAlcoholic=cocktail.is_alcoholic,
        sourceName=cocktail.source_name,
        ingredients=[ingredient_to_response(item) for item in cocktail.ingredients],
        steps=[step_to_response(item) for item in cocktail.steps],
    )


def ingredient_to_response(item: CocktailIngredient) -> IngredientResponse:
    return IngredientResponse(
        slug=item.ingredient.slug,
        nameZh=item.ingredient.name_zh,
        nameEn=item.ingredient.name_en,
        amount=item.amount,
        requirement=item.requirement,
        displayOrder=item.display_order,
        note=item.note,
    )


def step_to_response(item: CocktailStep) -> StepResponse:
    return StepResponse(
        stepNumber=item.step_number,
        instruction=item.instruction,
        technique=item.technique,
        timerSeconds=item.timer_seconds,
        tip=item.tip,
    )
