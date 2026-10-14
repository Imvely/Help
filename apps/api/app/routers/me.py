"""회원 전용: 프로필 동기화(opt-in, 암호화), 스캔 기록 동기화."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import AuthUser, require_user
from app.db import models as m
from app.db.base import get_db
from app.services import crypto

router = APIRouter(prefix="/me", tags=["me"])


class ProfileIn(BaseModel):
    id: str | None = None
    label: str = Field("나", max_length=50)
    payload: str = Field(..., max_length=20000)  # 앱 프로필 JSON 문자열(서버는 내용을 해석하지 않는다)
    sync_consent: bool


class ProfileOut(BaseModel):
    id: str
    label: str
    payload: str
    sync_consent: bool
    updated_at: datetime


@router.get("/profiles", response_model=list[ProfileOut])
def list_profiles(user: AuthUser = Depends(require_user), db: Session = Depends(get_db)):
    rows = db.execute(select(m.Profile).where(m.Profile.user_id == user.id)).scalars().all()
    return [ProfileOut(id=p.id, label=p.label, payload=crypto.decrypt(p.encrypted_payload),
                       sync_consent=p.sync_consent, updated_at=p.updated_at) for p in rows]


@router.put("/profiles", response_model=ProfileOut)
def upsert_profile(body: ProfileIn, user: AuthUser = Depends(require_user),
                   db: Session = Depends(get_db)):
    # 민감정보 별도 동의가 없으면 저장하지 않는다(있던 것도 삭제).
    if not body.sync_consent:
        if body.id:
            p = db.get(m.Profile, body.id)
            if p and p.user_id == user.id:
                db.delete(p)
                db.commit()
        return ProfileOut(id=body.id or "", label=body.label, payload="", sync_consent=False,
                          updated_at=datetime.now())
    p = db.get(m.Profile, body.id) if body.id else None
    if p and p.user_id != user.id:
        p = None
    if not p:
        p = m.Profile(user_id=user.id, label=body.label, encrypted_payload=b"", sync_consent=True)
        db.add(p)
    p.label = body.label
    p.encrypted_payload = crypto.encrypt(body.payload)
    p.sync_consent = True
    db.commit()
    db.refresh(p)
    return ProfileOut(id=p.id, label=p.label, payload=body.payload, sync_consent=True,
                      updated_at=p.updated_at)


@router.delete("/profiles/{profile_id}", status_code=204)
def delete_profile(profile_id: str, user: AuthUser = Depends(require_user),
                   db: Session = Depends(get_db)):
    p = db.get(m.Profile, profile_id)
    if p and p.user_id == user.id:
        db.delete(p)
        db.commit()


class ScanIn(BaseModel):
    client_id: str = Field(..., max_length=36)
    ean13: str | None = None
    product_id: str | None = None
    method: str = "barcode"
    created_at: datetime


class ScansIn(BaseModel):
    scans: list[ScanIn] = Field(..., max_length=500)


class ScanOut(BaseModel):
    id: str
    client_id: str | None
    ean13: str | None
    product_id: str | None
    product_name: str | None
    method: str
    created_at: datetime


@router.post("/scans", response_model=dict)
def sync_scans(body: ScansIn, user: AuthUser = Depends(require_user), db: Session = Depends(get_db)):
    existing = set(
        db.execute(select(m.Scan.client_id).where(m.Scan.user_id == user.id,
                                                  m.Scan.client_id.in_([s.client_id for s in body.scans])))
        .scalars()
    )
    added = 0
    for s in body.scans:
        if s.client_id in existing:
            continue
        pid = s.product_id
        if not pid and s.ean13:
            b = db.get(m.ProductBarcode, s.ean13)
            pid = b.product_id if b else None
        db.add(m.Scan(user_id=user.id, client_id=s.client_id, ean13=s.ean13, product_id=pid,
                      method=s.method, created_at=s.created_at))
        added += 1
    db.commit()
    return {"added": added, "skipped": len(body.scans) - added}


@router.get("/scans", response_model=list[ScanOut])
def list_scans(limit: int = 200, user: AuthUser = Depends(require_user),
               db: Session = Depends(get_db)):
    rows = db.execute(
        select(m.Scan, m.Product.name).join(m.Product, m.Product.id == m.Scan.product_id, isouter=True)
        .where(m.Scan.user_id == user.id).order_by(m.Scan.created_at.desc()).limit(limit)
    ).all()
    return [ScanOut(id=s.id, client_id=s.client_id, ean13=s.ean13, product_id=s.product_id,
                    product_name=name, method=s.method, created_at=s.created_at) for s, name in rows]
