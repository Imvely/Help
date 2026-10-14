"""업로드 파일 저장소. 개발은 로컬 디렉터리, 운영은 R2/MinIO(S3 호환)로 교체 예정.

key 는 'ocr/2026/10/14/<uuid>.jpg' 형태의 상대 경로다.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from pathlib import Path

from app.config import get_settings


def _root() -> Path:
    p = Path(get_settings().upload_dir)
    p.mkdir(parents=True, exist_ok=True)
    return p


def put_bytes(data: bytes, prefix: str = "ocr", ext: str = "jpg") -> str:
    now = datetime.now(UTC)
    key = f"{prefix}/{now:%Y/%m/%d}/{uuid.uuid4()}.{ext}"
    path = _root() / key
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return key


def get_bytes(key: str) -> bytes:
    return (_root() / key).read_bytes()


def exists(key: str) -> bool:
    return (_root() / key).exists()
