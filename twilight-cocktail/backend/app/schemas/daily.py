from datetime import date

from pydantic import BaseModel

from app.schemas.cocktail import CocktailResponse


class DailyPickResponse(BaseModel):
    pickDate: date
    reason: str
    cocktail: CocktailResponse
