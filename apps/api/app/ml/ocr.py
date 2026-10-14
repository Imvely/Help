"""OCR 엔진 래퍼. PaddleOCR(PP-OCRv5 korean) 이 설치돼 있으면 쓰고, 아니면 None.

설치: uv pip install -e ".[ocr]"  (paddlepaddle + paddleocr, 수백 MB)
"""

from __future__ import annotations

import io
from functools import lru_cache


class PaddleOcr:
    def __init__(self) -> None:
        from paddleocr import PaddleOCR  # type: ignore

        self.ocr = PaddleOCR(lang="korean", use_doc_orientation_classify=False,
                             use_doc_unwarping=False, use_textline_orientation=True)

    def run(self, image_bytes: bytes) -> tuple[str, float]:
        """(텍스트, 평균 confidence)"""
        import numpy as np
        from PIL import Image

        img = np.asarray(Image.open(io.BytesIO(image_bytes)).convert("RGB"))
        results = self.ocr.predict(img)
        lines: list[str] = []
        scores: list[float] = []
        for r in results:
            lines.extend(r.get("rec_texts", []))
            scores.extend(r.get("rec_scores", []))
        conf = sum(scores) / len(scores) if scores else 0.0
        return "\n".join(lines), conf


@lru_cache
def get_ocr() -> PaddleOcr | None:
    from app.config import get_settings

    if not get_settings().ocr_use_paddle:
        return None
    try:
        return PaddleOcr()
    except ImportError:
        return None
