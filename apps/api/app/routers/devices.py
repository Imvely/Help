"""푸시 토큰 등록 (회수 알림, P1-4). 비회원도 등록 가능."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import OptionalUser, anonymous_id, optional_user
from app.db import models as m
from app.db.base import get_db

router = APIRouter(prefix="/devices", tags=["devices"])


class DeviceIn(BaseModel):
    expo_push_token: str = Field(..., max_length=200, pattern=r"^(ExponentPushToken|ExpoPushToken)\[.+\]$")
    platform: str = Field(..., pattern=r"^(ios|android)$")
    enabled: bool = True


@router.post("", status_code=201)
def register(body: DeviceIn, db: Session = Depends(get_db), user: OptionalUser = Depends(optional_user),
             anon: str | None = Depends(anonymous_id)):
    d = db.execute(
        select(m.Device).where(m.Device.expo_push_token == body.expo_push_token)).scalar_one_or_none()
    if not d:
        d = m.Device(expo_push_token=body.expo_push_token, platform=body.platform)
        db.add(d)
    d.platform = body.platform
    d.enabled = body.enabled
    if user:
        d.user_id = user.id
    if anon:
        d.anonymous_id = anon
    db.commit()
    return {"id": d.id, "enabled": d.enabled}
