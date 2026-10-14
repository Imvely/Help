"""제품 조회 API."""

from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db import models as m
from app.db.base import get_db
from app.schemas import ProductResponse, SearchHit, SearchResponse
from app.services.product_service import build_response, load_product, product_by_barcode

router = APIRouter(prefix="/products", tags=["products"])

_EAN = re.compile(r"^\d{8}$|^\d{12,14}$")


def normalize_ean(code: str) -> str:
    """UPC-A(12자리)는 앞에 0 을 붙여 EAN-13 으로. iOS 가 UPC-A 를 EAN-13 으로 주는 경우도 흡수."""
    code = code.strip()
    if not _EAN.match(code):
        raise HTTPException(status_code=422, detail="바코드 형식이 올바르지 않습니다 (EAN-8/13, UPC-A)")
    if len(code) == 12:
        code = "0" + code
    if len(code) == 14 and code.startswith("0"):
        code = code[1:]
    return code


@router.get("/by-barcode/{code}", response_model=ProductResponse)
def get_by_barcode(code: str, response: Response, db: Session = Depends(get_db)):
    ean = normalize_ean(code)
    product = product_by_barcode(db, ean)
    if not product:
        raise HTTPException(status_code=404,
                            detail="등록되지 않은 바코드입니다. 뒷면 라벨을 비춰 등록해 주세요.")
    response.headers["Cache-Control"] = "public, max-age=3600"
    return build_response(db, product)


@router.get("/search", response_model=SearchResponse)
def search(q: str = Query(..., min_length=1, max_length=100), limit: int = Query(20, le=50),
           db: Session = Depends(get_db)):
    like = f"%{q.strip()}%"
    stmt = (
        select(m.Product)
        .where(or_(m.Product.name.ilike(like), m.Product.brand.ilike(like),
                   m.Product.manufacturer.ilike(like)))
        .order_by(m.Product.name)
        .limit(limit)
    )
    rows = db.execute(stmt).scalars().all()
    return SearchResponse(
        query=q,
        hits=[SearchHit(id=p.id, name=p.name, brand=p.brand, category=p.category,
                        image_url=p.image_url) for p in rows],
    )


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: str, response: Response, db: Session = Depends(get_db)):
    product = load_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="제품을 찾을 수 없습니다")
    response.headers["Cache-Control"] = "public, max-age=3600"
    return build_response(db, product)
