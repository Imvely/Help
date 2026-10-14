"""프로필 암호화 (docs/04 §2-5, docs/08 §4).

민감정보(알레르기·임신·질환)는 Fernet(AES-128-CBC + HMAC) 으로 암호화해 bytea 로만 저장한다.
키는 EODISAN_PROFILE_ENCRYPTION_KEY.
생성: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

from __future__ import annotations

from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException

from app.config import get_settings


@lru_cache
def _fernet() -> Fernet:
    key = get_settings().profile_encryption_key
    if not key:
        raise HTTPException(503, "프로필 동기화는 아직 설정되지 않았습니다 (EODISAN_PROFILE_ENCRYPTION_KEY)")
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt(plaintext: str) -> bytes:
    return _fernet().encrypt(plaintext.encode("utf-8"))


def decrypt(token: bytes) -> str:
    try:
        return _fernet().decrypt(bytes(token)).decode("utf-8")
    except InvalidToken as e:
        raise HTTPException(500, "프로필을 복호화할 수 없습니다(키 불일치)") from e
