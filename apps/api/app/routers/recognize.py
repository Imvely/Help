"""이미지 인식 (P1). 임베딩 모델이 설정돼 있지 않으면 501.

흐름(docs/03 §3): 앱이 320px WebP 또는 512-d 벡터를 보내면 → 서버 임베딩 → pgvector ANN →
top-20 이미지를 product_id 로 묶어 다수결 + 최고 유사도 → 후보 반환.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.base import get_db
from app.ml.retrieval import search_similar
from app.schemas import ProductBrief, RecognizeCandidate, RecognizeResponse

router = APIRouter(prefix="/recognize", tags=["recognize"])


@router.post("", response_model=RecognizeResponse)
async def recognize(
    image: UploadFile | None = File(None),
    embedding: str | None = Form(None),  # JSON 배열 문자열(온디바이스 임베딩 경로)
    model_version: str | None = Form(None),
    db: Session = Depends(get_db),
):
    settings = get_settings()
    if image is None and embedding is None:
        raise HTTPException(422, "image 또는 embedding 중 하나가 필요합니다")

    if embedding is not None:
        import json

        vec = json.loads(embedding)
        version = model_version or settings.embedding_model_version
    else:
        from app.ml.embedder import get_embedder

        emb = get_embedder()
        if emb is None:
            raise HTTPException(
                501, "이미지 인식 모델이 아직 배포되지 않았습니다 (EODISAN_EMBEDDER_ONNX_PATH)")
        vec = emb.embed_bytes(await image.read())
        version = settings.embedding_model_version

    hits = search_similar(db, vec, version, k=20)
    if not hits:
        return RecognizeResponse(model_version=version, candidates=[], confident=False)

    # SKU 단위 집계: 다수결 + 최고 유사도
    by_product: dict[str, dict] = {}
    for product, sim in hits:
        d = by_product.setdefault(product.id, {"product": product, "votes": 0, "sim": 0.0})
        d["votes"] += 1
        d["sim"] = max(d["sim"], sim)
    ranked = sorted(by_product.values(), key=lambda d: (d["votes"], d["sim"]), reverse=True)[:5]
    candidates = [
        RecognizeCandidate(
            product=ProductBrief(id=d["product"].id, name=d["product"].name, brand=d["product"].brand,
                                 manufacturer=d["product"].manufacturer,
                                 category=d["product"].category,
                                 subcategory=d["product"].subcategory,
                                 image_url=d["product"].image_url),
            similarity=round(d["sim"], 4), votes=d["votes"],
        )
        for d in ranked
    ]
    top = ranked[0]
    confident = top["votes"] >= 2 and top["sim"] >= 0.85
    return RecognizeResponse(model_version=version, candidates=candidates, confident=confident)
