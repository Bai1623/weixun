from app.data.seed_cocktails import SEED_COCKTAILS


def test_seed_data_contains_required_mvp_volume() -> None:
    assert len(SEED_COCKTAILS) >= 25
    assert sum(1 for cocktail in SEED_COCKTAILS if not cocktail["is_alcoholic"]) >= 5


def test_seed_data_records_are_complete() -> None:
    for cocktail in SEED_COCKTAILS:
        assert cocktail["name_en"]
        assert cocktail["name_zh"]
        assert cocktail["slug"]
        assert cocktail["short_description"]
        assert cocktail["source_name"]
        assert cocktail["review_status"] in {"trusted", "approved"}
        assert len(cocktail["ingredients"]) >= 2
        assert len(cocktail["steps"]) >= 2
        assert all(
            0 <= cocktail["flavors"][key] <= 5
            for key in ["sweet", "sour", "bitter", "strong", "fresh"]
        )
