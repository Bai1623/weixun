from sqlalchemy import select
from sqlalchemy.orm import Session

from app.data.seed_cocktails import SEED_COCKTAILS
from app.db.models import Cocktail, CocktailIngredient, CocktailStep, Ingredient


def seed_cocktails(db: Session) -> int:
    existing_by_slug = {
        cocktail.slug: cocktail for cocktail in db.scalars(select(Cocktail)).all()
    }
    ingredients_by_slug = {
        ingredient.slug: ingredient for ingredient in db.scalars(select(Ingredient)).all()
    }
    created = 0

    for record in SEED_COCKTAILS:
        existing = existing_by_slug.get(record["slug"])
        if existing is not None:
            existing.image_url = record["image_url"]
            existing.image_tone = record["image_tone"]
            existing.source_name = record["source_name"]
            existing.popularity_weight = record["popularity_weight"]
            continue

        flavors = record["flavors"]
        cocktail = Cocktail(
            slug=record["slug"],
            name_zh=record["name_zh"],
            name_en=record["name_en"],
            short_description=record["short_description"],
            story=record["story"],
            image_url=record["image_url"],
            image_tone=record["image_tone"],
            base_spirit=record["base_spirit"],
            glass_type=record["glass_type"],
            method=record["method"],
            difficulty=record["difficulty"],
            prep_minutes=record["prep_minutes"],
            alcohol_level=record["alcohol_level"],
            flavor_sweet=flavors["sweet"],
            flavor_sour=flavors["sour"],
            flavor_bitter=flavors["bitter"],
            flavor_strong=flavors["strong"],
            flavor_fresh=flavors["fresh"],
            tags="|".join(record["tags"]),
            popularity_weight=record["popularity_weight"],
            beginner_friendly=record["beginner_friendly"],
            is_iba=record["is_iba"],
            is_alcoholic=record["is_alcoholic"],
            review_status=record["review_status"],
            source_name=record["source_name"],
        )
        db.add(cocktail)
        db.flush()

        for ingredient_record in record["ingredients"]:
            ingredient = ingredients_by_slug.get(ingredient_record["slug"])
            if ingredient is None:
                ingredient = Ingredient(
                    slug=ingredient_record["slug"],
                    name_zh=ingredient_record["name_zh"],
                    name_en=ingredient_record["name_en"],
                )
                db.add(ingredient)
                db.flush()
                ingredients_by_slug[ingredient.slug] = ingredient

            db.add(
                CocktailIngredient(
                    cocktail_id=cocktail.id,
                    ingredient_id=ingredient.id,
                    amount=ingredient_record["amount"],
                    requirement=ingredient_record["requirement"],
                    display_order=ingredient_record["display_order"],
                    note=ingredient_record.get("note"),
                )
            )

        for step_record in record["steps"]:
            db.add(
                CocktailStep(
                    cocktail_id=cocktail.id,
                    step_number=step_record["step_number"],
                    instruction=step_record["instruction"],
                    technique=step_record["technique"],
                    timer_seconds=step_record.get("timer_seconds"),
                    tip=step_record.get("tip"),
                )
            )

        existing_by_slug[record["slug"]] = cocktail
        created += 1

    db.commit()
    return created
