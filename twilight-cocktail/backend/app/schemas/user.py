from pydantic import BaseModel, Field


class AnonymousUserRequest(BaseModel):
    anonymousKey: str = Field(min_length=3, max_length=100)
    displayName: str | None = Field(default=None, max_length=80)


class UserResponse(BaseModel):
    id: str
    anonymousKey: str | None
    displayName: str | None
    isAnonymous: bool
