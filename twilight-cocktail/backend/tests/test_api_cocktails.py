from fastapi.testclient import TestClient


def test_cocktail_list_returns_seeded_recipes(client: TestClient) -> None:
    response = client.get("/api/v1/cocktails")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] >= 25
    assert payload["items"][0]["slug"]
    assert {"sweet", "sour", "bitter", "strong", "fresh"} <= set(payload["items"][0]["flavors"])


def test_cocktail_detail_returns_ingredients_and_steps(client: TestClient) -> None:
    response = client.get("/api/v1/cocktails/negroni")

    assert response.status_code == 200
    payload = response.json()
    assert payload["slug"] == "negroni"
    assert payload["nameZh"] == "尼格罗尼"
    assert len(payload["ingredients"]) >= 3
    assert len(payload["steps"]) >= 3


def test_cocktail_list_filters_non_alcoholic(client: TestClient) -> None:
    response = client.get("/api/v1/cocktails", params={"isAlcoholic": "false"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] >= 5
    assert all(not item["isAlcoholic"] for item in payload["items"])
