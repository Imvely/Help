"""익명 스캔 기록 (회수 푸시 매칭용). 회원은 /me/scans 로 동기화한다.

앱이 fire-and-forget 으로 호출. X-Anonymous-Id 헤더가 없으면 저장하지 않는다(204).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import OptionalUser, anonymous_id, optional_user
from app.db import models as m
from app.db.base import get_db

router = APIRouter(prefix="/scans", tags=["scans"])


class ScanEvent(BaseModel):
    ean13: str | None = None
    product_id: str | None = None
    method: str = "barcode"
    latency_ms: int | None = None


@router.post("", status_code=204)
def record(body: ScanEvent, db: Session = Depends(get_db), user: OptionalUser = Depends(optional_user),
           anon: str | None = Depends(anonymous_id)):
    if not user and not anon:
        return Response(status_code=204)
    pid = body.product_id
    if not pid and body.ean13:
        b = db.get(m.ProductBarcode, body.ean13)
        pid = b.product_id if b else None
    db.add(m.Scan(user_id=user.id if user else None, anonymous_id=None if user else anon,
                  product_id=pid, ean13=body.ean13, method=body.method, latency_ms=body.latency_ms))
    db.commit()
    return Response(status_code=204)
