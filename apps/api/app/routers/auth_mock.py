"""목업 로그인 (개발 전용). EODISAN_AUTH_MOCK=1 일 때만 열린다.

소셜 로그인 연동 전에 회원 기능(프로필 동기화·기록 동기화·푸시)을 테스트하기 위한 것.
같은 이름이면 항상 같은 사용자 ID(uuid5) 가 나오므로 "내 계정" 이 유지된다.
"""

from __future__ import annotations

import time
import uuid

import jwt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import hs256_secret
from app.config import get_settings
from app.db import models as m
from app.db.base import get_db

router = APIRouter(prefix="/auth/mock", tags=["auth(mock)"])

NAMESPACE = uuid.UUID("6f1c2b7e-0d1a-4b9a-9f4e-eodisan00001".replace("eodisan00001", "a1b2c3d4e5f6"))


class MockLoginIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=40, description="아무 이름. 같은 이름 = 같은 계정")


class MockLoginOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


@router.post("/token", response_model=MockLoginOut)
def mock_token(body: MockLoginIn, db: Session = Depends(get_db)):
    s = get_settings()
    if not s.auth_mock:
        raise HTTPException(404, "Not Found")
    uid = str(uuid.uuid5(NAMESPACE, body.name.strip().lower()))
    email = f"{body.name.strip().lower().replace(' ', '_')}@mock.local"
    ttl = 30 * 24 * 3600
    now = int(time.time())
    claims = {"sub": uid, "aud": "authenticated", "role": "authenticated", "email": email,
              "is_anonymous": False, "iat": now, "exp": now + ttl, "iss": "eodisan-mock"}
    token = jwt.encode(claims, hs256_secret(), algorithm="HS256")
    if not db.get(m.User, uid):
        db.add(m.User(id=uid))
        db.commit()
    return MockLoginOut(access_token=token, expires_in=ttl,
                        user={"id": uid, "email": email, "is_anonymous": False, "name": body.name})
