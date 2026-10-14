"""샘플 제품 적재 (로컬 데모용). 실행: python -m app.kb.sample_loader"""

from __future__ import annotations

from datetime import date
from pathlib import Path

import yaml
from sqlalchemy.orm import Session

from app.services.product_writer import IngredientIndex, LabelFacts, upsert_product

SEED = Path(__file__).parent / "seed" / "sample_products.yaml"


def load_sample_products(db: Session, path: Path = SEED) -> int:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))["products"]
    idx = IngredientIndex(db)
    n = 0
    for item in data:
        facts = LabelFacts(
            name=item["name"], brand=item.get("brand"), manufacturer=item.get("manufacturer"),
            category=item.get("category", "food"), subcategory=item.get("subcategory"),
            ean13=item.get("ean13"), ingredients_raw=item.get("ingredients_raw"),
            manufacturing_country=item.get("manufacturing_country"),
            manufacturer_country=item.get("manufacturer_country"),
            brand_owner_name=item.get("brand_owner_name"),
            brand_owner_country=item.get("brand_owner_country"),
            oem_flag=item.get("oem_flag"), origin_confidence=item.get("origin_confidence", "label_read"),
            may_contain=item.get("may_contain", []), nutrition=item.get("nutrition"),
        )
        upsert_product(db, facts, source="seed", source_date=date.today(), idx=idx)
        n += 1
    db.commit()
    return n


if __name__ == "__main__":
    from app.db.base import SessionLocal
    from app.kb.loader import load_all

    with SessionLocal() as s:
        load_all(s)
        print("sample products:", load_sample_products(s))
