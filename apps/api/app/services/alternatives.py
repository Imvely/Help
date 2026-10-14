"""대체 제품 추천 (docs/02 P1-2).

점수가 낮을수록 좋다: 유해(3)×10 + 논쟁(2)×3 + 주의(1)×1 + 미확인×0.2. 제조국 한국이면 우선.
'원산지 ≠ 안전' 원칙에 따라 국가는 정렬 기준일 뿐 점수에 넣지 않는다 — 사용자가 "국산 대안"을
원할 때의 정렬이며, 이유(reason)에 왜 골랐는지 사실만 적는다.
"""

from __future__ import annotations

from collections import Counter

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import models as m


def grade_counts(product: m.Product) -> dict[str, int]:
    c: Counter[str] = Counter()
    for pi in product.ingredients:
        hz = pi.ingredient.hazard if pi.ingredient else None
        c[str(hz.grade) if hz else "unknown"] += 1
    return dict(c)


def risk_score(counts: dict[str, int]) -> float:
    return (counts.get("3", 0) * 10 + counts.get("2", 0) * 3 + counts.get("1", 0) * 1
            + counts.get("unknown", 0) * 0.2)


def find_alternatives(db: Session, product: m.Product, limit: int = 3):
    stmt = (
        select(m.Product)
        .where(m.Product.category == product.category, m.Product.id != product.id)
        .options(selectinload(m.Product.ingredients).selectinload(m.ProductIngredient.ingredient)
                 .selectinload(m.Ingredient.hazard), selectinload(m.Product.origin))
        .limit(500)
    )
    if product.subcategory:
        stmt = stmt.where(m.Product.subcategory == product.subcategory)
    candidates = db.execute(stmt).scalars().all()
    base = risk_score(grade_counts(product))
    scored = []
    for c in candidates:
        counts = grade_counts(c)
        score = risk_score(counts)
        if score > base:
            continue  # 더 나쁜 건 추천하지 않는다
        country = c.origin.manufacturing_country if c.origin else None
        reasons = []
        if score < base:
            reasons.append("주의 성분이 더 적음")
        if country == "KR":
            reasons.append("제조국 한국")
        if not reasons:
            reasons.append("같은 분류, 성분 등급 동일")
        scored.append((country != "KR", score, c, counts, country, " · ".join(reasons)))
    scored.sort(key=lambda t: (t[0], t[1]))
    return [(c, counts, country, reason) for _, _, c, counts, country, reason in scored[:limit]]
