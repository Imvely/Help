"""회수·판매중지 목록 (식약처 I0490 동기화 결과)."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import models as m
from app.db.base import get_db
from app.schemas import RecallOut

router = APIRouter(prefix="/recalls", tags=["recalls"])


@router.get("", response_model=list[RecallOut])
def list_recalls(since: date | None = Query(None), limit: int = Query(100, le=500),
                 db: Session = Depends(get_db)):
    stmt = select(m.Recall).order_by(m.Recall.issued_at.desc()).limit(limit)
    if since:
        stmt = stmt.where(m.Recall.issued_at >= since)
    rows = db.execute(stmt).scalars().all()
    return [RecallOut(id=r.id, reason=r.reason, grade=r.grade, issued_at=r.issued_at,
                      product_name=r.product_name, company_name=r.company_name) for r in rows]
