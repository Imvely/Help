"""KB 시드(YAML) → DB 적재. 멱등(여러 번 실행해도 같은 결과).

실행: python -m app.kb.loader
규칙: 등급 레코드는 출처 URL·검토일이 없으면 적재를 거부한다 (docs/05 §9).
"""

from __future__ import annotations

from datetime import date
from pathlib import Path

import yaml
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import models as m

SEED_DIR = Path(__file__).parent / "seed"


class SeedError(ValueError):
    pass


def load_allergens(db: Session, path: Path = SEED_DIR / "allergens.yaml") -> int:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))["allergens"]
    # 부모가 먼저 들어가야 FK 가 맞는다 → parent 없는 것부터.
    data.sort(key=lambda a: (a.get("parent") is not None, a["code"].count(".")))
    n = 0
    for a in data:
        row = db.get(m.Allergen, a["code"])
        if not row:
            row = m.Allergen(code=a["code"], name_ko=a["name_ko"])
            db.add(row)
        row.name_ko = a["name_ko"]
        row.parent_code = a.get("parent")
        row.synonyms = a.get("synonyms", [])
        db.flush()
        existing = {
            j.jurisdiction
            for j in db.execute(
                select(m.AllergenJurisdiction).where(
                    m.AllergenJurisdiction.allergen_code == a["code"]
                )
            ).scalars()
        }
        for jur in a.get("jurisdictions", []):
            if jur not in existing:
                db.add(m.AllergenJurisdiction(allergen_code=a["code"], jurisdiction=jur,
                                              mandatory=True))
        n += 1
    db.commit()
    return n


def _validate_hazard(name: str, h: dict) -> None:
    if h.get("grade") not in (0, 1, 2, 3):
        raise SeedError(f"{name}: grade 는 0~3 이어야 합니다")
    if h.get("evidence") not in ("regulatory", "systematic", "observational", "animal_cell"):
        raise SeedError(f"{name}: evidence 값이 잘못됐습니다")
    if not h.get("sources"):
        raise SeedError(f"{name}: 출처 URL(sources) 이 필요합니다")
    if not isinstance(h.get("reviewed"), date):
        raise SeedError(f"{name}: reviewed 날짜가 필요합니다")
    if not h.get("summary"):
        raise SeedError(f"{name}: summary 가 필요합니다")


def load_ingredients(db: Session, path: Path = SEED_DIR / "ingredients.yaml") -> int:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))["ingredients"]
    n = 0
    for item in data:
        name = item["name_ko"]
        row = db.execute(select(m.Ingredient).where(m.Ingredient.name_ko == name)).scalar_one_or_none()
        if not row:
            row = m.Ingredient(name_ko=name)
            db.add(row)
        row.name_en = item.get("name_en")
        row.inci_name = item.get("inci_name")
        row.e_number = item.get("e_number")
        row.functions = item.get("functions", [])
        row.synonyms = item.get("synonyms", [])
        db.flush()
        h = item.get("hazard")
        if h:
            _validate_hazard(name, h)
            hz = db.get(m.IngredientHazard, row.id)
            if not hz:
                hz = m.IngredientHazard(ingredient_id=row.id, grade=h["grade"],
                                        evidence_level=h["evidence"], summary_ko=h["summary"],
                                        last_reviewed=h["reviewed"])
                db.add(hz)
            hz.grade = h["grade"]
            hz.evidence_level = h["evidence"]
            hz.regulatory_status = {k: str(v) for k, v in (h.get("regulatory_status") or {}).items()}
            hz.applies_to_groups = h.get("groups", [])
            hz.summary_ko = h["summary"]
            hz.source_urls = h["sources"]
            hz.last_reviewed = h["reviewed"]
        n += 1
    db.commit()
    return n


def load_all(db: Session) -> dict[str, int]:
    return {
        "allergens": load_allergens(db),
        "ingredients": load_ingredients(db),
        "common_ingredients": load_ingredients(db, SEED_DIR / "common_ingredients.yaml"),
    }


if __name__ == "__main__":
    from app.db.base import Base, SessionLocal, engine

    Base.metadata.create_all(engine)
    with SessionLocal() as s:
        print(load_all(s))
