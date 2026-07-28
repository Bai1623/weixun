from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import DailyPick


def test_anonymous_user_is_idempotent(client: TestClient) -> None:
    body = {"anonymousKey": "browser-device-1", "displayName": "暮色访客"}

    first = client.post("/api/v1/users/anonymous", json=body)
    second = client.post("/api/v1/users/anonymous", json=body)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]
    assert first.json()["anonymousKey"] == "browser-device-1"


def test_daily_pick_is_stable_for_same_user_and_date(
    client: TestClient, db_session: Session
) -> None:
    user = client.post("/api/v1/users/anonymous", json={"anonymousKey": "daily-device"}).json()

    first = client.get(
        "/api/v1/daily-pick",
        params={"userId": user["id"], "pickDate": "2026-07-28"},
    )
    second = client.get(
        "/api/v1/daily-pick",
        params={"userId": user["id"], "pickDate": "2026-07-28"},
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["cocktail"]["slug"] == second.json()["cocktail"]["slug"]
    picks = db_session.scalars(
        select(DailyPick).where(
            DailyPick.user_id == user["id"],
            DailyPick.pick_date == date(2026, 7, 28),
        )
    ).all()
    assert len(picks) == 1


def test_favorite_and_history_roundtrip(client: TestClient) -> None:
    user = client.post("/api/v1/users/anonymous", json={"anonymousKey": "activity-device"}).json()

    favorite_response = client.post(
        "/api/v1/favorites/negroni",
        params={"userId": user["id"]},
    )
    favorites = client.get("/api/v1/favorites", params={"userId": user["id"]})
    history_response = client.post(
        "/api/v1/history/cocktails/negroni",
        params={"userId": user["id"]},
    )
    history = client.get("/api/v1/history/cocktails", params={"userId": user["id"]})
    delete_response = client.delete(
        "/api/v1/favorites/negroni",
        params={"userId": user["id"]},
    )

    assert favorite_response.status_code == 200
    assert "negroni" in favorites.json()["slugs"]
    assert history_response.status_code == 200
    assert history.json()["items"][0]["slug"] == "negroni"
    assert delete_response.status_code == 204
