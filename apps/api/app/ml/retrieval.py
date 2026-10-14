"""벡터 검색. Postgres 면 pgvector HNSW(코사인), 그 외(SQLite 테스트)는 파이썬 브루트포스.

반환: [(Product, similarity)] — similarity = 1 - cosine_distance.
"""

from __future__ import annotations

import math

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import models as m


def _cos(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=False))
    na = math.sqrt(sum(x * x for x in a)) or 1e-8
    nb = math.sqrt(sum(x * x for x in b)) or 1e-8
    return dot / (na * nb)


def search_similar(db: Session, vec: list[float], model_version: str, k: int = 20):
    dialect = db.get_bind().dialect.name
    if dialect == "postgresql":
        dist = m.ProductImage.embedding.cosine_distance(vec)
        stmt = (
            select(m.ProductImage.product_id, dist.label("d"))
            .where(m.ProductImage.model_version == model_version)
            .order_by(dist)
            .limit(k)
        )
        rows = db.execute(stmt).all()
        out = []
        for product_id, d in rows:
            p = db.get(m.Product, product_id)
            if p:
                out.append((p, 1.0 - float(d)))
        return out

    # fallback: 소규모/테스트용
    rows = db.execute(
        select(m.ProductImage).where(m.ProductImage.model_version == model_version)
    ).scalars().all()
    scored = [(r.product_id, _cos(vec, r.embedding)) for r in rows if r.embedding]
    scored.sort(key=lambda t: t[1], reverse=True)
    out = []
    for product_id, sim in scored[:k]:
        p = db.get(m.Product, product_id)
        if p:
            out.append((p, sim))
    return out
