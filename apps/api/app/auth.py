"""인증 의존성 (docs/03 §7).

Supabase 가 발급한 JWT(HS256)를 검증한다. 비밀키가 없으면 로그인 기능은 503(설정 필요).
- require_user: Bearer 필수 → User
- optional_user: 있으면 User, 없으면 None (비회원 허용 엔드포인트)
비회원 식별은 앱이 보내는 X-Anonymous-Id 헤더(기기 UUID)로 한다.
"""

from __future__ import annotations

from dataclasses import dataclass

import jwt
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import models as m
from app.db.base import get_db


@dataclass
class AuthUser:
    id: str
    email: str | None = None
    is_anonymous: bool = False


OptionalUser = AuthUser | None


def _decode(token: str) -> dict:
    secret = get_settings().supabase_jwt_secret
    if not secret:
        raise HTTPException(503, "로그인은 아직 설정되지 않았습니다 (EODISAN_SUPABASE_JWT_SECRET)")
    try:
        return jwt.decode(token, secret, algorithms=["HS256"], audience="authenticated",
                          options={"require": ["sub", "exp"]})
    except jwt.ExpiredSignatureError as e:
        raise HTTPException(401, "토큰이 만료되었습니다") from e
    except jwt.InvalidTokenError as e:
        raise HTTPException(401, "토큰이 유효하지 않습니다") from e


def _ensure_user(db: Session, claims: dict) -> AuthUser:
    uid = claims["sub"]
    if not db.get(m.User, uid):
        db.add(m.User(id=uid))
        db.commit()
    return AuthUser(id=uid, email=claims.get("email"), is_anonymous=bool(claims.get("is_anonymous")))


def require_user(authorization: str | None = Header(None), db: Session = Depends(get_db)) -> AuthUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "로그인이 필요합니다")
    return _ensure_user(db, _decode(authorization.split(" ", 1)[1].strip()))


def optional_user(authorization: str | None = Header(None), db: Session = Depends(get_db)) -> OptionalUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    if not get_settings().supabase_jwt_secret:
        return None
    try:
        return _ensure_user(db, _decode(authorization.split(" ", 1)[1].strip()))
    except HTTPException:
        return None


def anonymous_id(x_anonymous_id: str | None = Header(None)) -> str | None:
    if x_anonymous_id and 8 <= len(x_anonymous_id) <= 36:
        return x_anonymous_id
    return None
