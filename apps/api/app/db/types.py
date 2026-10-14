"""DB 방언(dialect)에 따라 달라지는 컬럼 타입.

pgvector 의 halfvec 은 Postgres 전용이라, SQLite(테스트/로컬)에서는 JSON 으로 저장합니다.
덕분에 같은 모델 코드를 테스트(SQLite)와 운영(Postgres)에서 그대로 씁니다.
"""

from __future__ import annotations

import json

from sqlalchemy import JSON, TypeDecorator
from sqlalchemy.dialects.postgresql import JSONB


class EmbeddingType(TypeDecorator):
    impl = JSON
    cache_ok = True

    def __init__(self, dim: int = 512) -> None:
        super().__init__()
        self.dim = dim

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            from pgvector.sqlalchemy import HALFVEC

            return dialect.type_descriptor(HALFVEC(self.dim))
        return dialect.type_descriptor(JSON())

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql":
            return list(value)
        return list(map(float, value))

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, str):
            return json.loads(value)
        return list(value)


class JSONType(TypeDecorator):
    """Postgres 에서는 JSONB, 그 외에는 JSON."""

    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(JSONB())
        return dialect.type_descriptor(JSON())
