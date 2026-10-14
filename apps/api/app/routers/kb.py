"""성분 지식 베이스 조회 (성분 상세 화면용)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.db import models as m
from app.db.base import get_db
from app.schemas import IngredientDetail

router = APIRouter(prefix="/kb", tags=["kb"])


def _detail(i: m.Ingredient) -> IngredientDetail:
    h = i.hazard
    return IngredientDetail(
        id=i.id, name_ko=i.name_ko, name_en=i.name_en, e_number=i.e_number,
        functions=i.functions, grade=h.grade if h else None,
        evidence=h.evidence_level if h else None,
        regulatory_status=h.regulatory_status if h else {},
        applies_to_groups=h.applies_to_groups if h else [],
        summary=h.summary_ko if h else None, source_urls=h.source_urls if h else [],
        last_reviewed=h.last_reviewed if h else None,
        allergens=[a.allergen_code for a in i.allergens],
    )


@router.get("/ingredients", response_model=list[IngredientDetail])
def search_ingredients(q: str = Query(..., min_length=1), limit: int = Query(20, le=100),
                       db: Session = Depends(get_db)):
    like = f"%{q}%"
    stmt = (
        select(m.Ingredient)
        .where(or_(m.Ingredient.name_ko.ilike(like), m.Ingredient.name_en.ilike(like),
                   m.Ingredient.e_number.ilike(like)))
        .options(selectinload(m.Ingredient.hazard), selectinload(m.Ingredient.allergens))
        .limit(limit)
    )
    return [_detail(i) for i in db.execute(stmt).scalars().all()]


@router.get("/ingredients/{ingredient_id}", response_model=IngredientDetail)
def get_ingredient(ingredient_id: str, response: Response, db: Session = Depends(get_db)):
    i = db.get(m.Ingredient, ingredient_id,
               options=[selectinload(m.Ingredient.hazard), selectinload(m.Ingredient.allergens)])
    if not i:
        raise HTTPException(404, "성분을 찾을 수 없습니다")
    response.headers["Cache-Control"] = "public, max-age=86400"
    return _detail(i)


@router.get("/allergens")
def list_allergens(jurisdiction: str | None = Query(None), db: Session = Depends(get_db)):
    rows = db.execute(select(m.Allergen).order_by(m.Allergen.code)).scalars().all()
    if jurisdiction:
        codes = {
            j.allergen_code
            for j in db.execute(
                select(m.AllergenJurisdiction).where(
                    m.AllergenJurisdiction.jurisdiction == jurisdiction.upper(),
                    m.AllergenJurisdiction.mandatory.is_(True),
                )
            ).scalars()
        }
        rows = [a for a in rows if a.code in codes]
    return [{"code": a.code, "name_ko": a.name_ko, "parent_code": a.parent_code} for a in rows]
