from datetime import date

import pytest
from sqlalchemy import select

from app.db import models as m
from app.kb.loader import SeedError, _validate_hazard


def test_kr_mandatory_allergens_are_19(db):
    codes = db.execute(
        select(m.AllergenJurisdiction.allergen_code).where(
            m.AllergenJurisdiction.jurisdiction == "KR", m.AllergenJurisdiction.mandatory.is_(True)
        )
    ).scalars().all()
    # 조개류(mollusc.bivalve) 와 그 하위 굴/전복/홍합은 법상 한 항목으로 센다
    top = {c for c in codes if not c.startswith("mollusc.bivalve.")}
    assert len(top) == 19, sorted(top)


def test_every_hazard_has_source_and_review_date(db):
    rows = db.execute(select(m.IngredientHazard)).scalars().all()
    assert rows
    for h in rows:
        assert h.source_urls and h.last_reviewed
        assert h.grade in (0, 1, 2, 3)


def test_seed_validation_rejects_missing_source():
    with pytest.raises(SeedError):
        _validate_hazard("x", {"grade": 0, "evidence": "regulatory", "summary": "s",
                               "reviewed": date(2026, 1, 1), "sources": []})


def test_known_grades(db):
    def grade(name):
        i = db.execute(select(m.Ingredient).where(m.Ingredient.name_ko == name)).scalar_one()
        return i.hazard.grade, i.hazard.applies_to_groups

    assert grade("아스파탐") == (2, ["pku"])
    assert grade("부분경화유")[0] == 3
    assert grade("아세설팜칼륨")[0] == 0
    assert "pet" in grade("자일리톨")[1]


def test_sample_products_load_and_render(client, db):
    from app.kb.sample_loader import load_sample_products

    assert load_sample_products(db) == 8
    body = client.get("/v1/products/by-barcode/8800000009007").json()  # 컵라면: 중첩 복합원재료
    names = [i["name"] for i in body["ingredients"]]
    assert names == ["면", "스프"]
    texts = [b["text"] for b in body["origin"]["badges"]]
    assert texts[0] == "제조국: 🇰🇷 한국"
    assert body["nutrition"]["sodium_mg"] == 1790
    energy = client.get("/v1/products/by-barcode/8800000009003").json()
    assert energy["origin"]["oem"] is True and energy["nutrition"]["high_caffeine"] is True
    assert "child" in next(i for i in energy["ingredients"] if i["name"] == "황색4호")["applies_to_groups"]
