"""라벨 사진(+OCR 텍스트) → 구조화 추출 (docs/06 §3-2).

Claude 에 이미지와(있으면) OCR 텍스트를 함께 주고 JSON 스키마로 강제 출력받는다.
PaddleOCR 이 없어도 Claude 비전만으로 동작한다. 원칙: 라벨에 없는 값은 null, 추정 금지.
"""

from __future__ import annotations

import base64
import json
import logging

from pydantic import BaseModel, ConfigDict, Field

from app.config import get_settings

log = logging.getLogger(__name__)


class ExtractedIngredient(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    origin: str | None = Field(
        None, description="라벨 원문 그대로: 국산/중국산/미국산/외국산 등. 없으면 null")
    function: str | None = Field(None, description="괄호 속 용도: 감미료, 보존료 등")
    sub_ingredients: list[str] = Field(default_factory=list)


class LabelExtraction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ingredients_raw: str | None = Field(None, description="'원재료명:' 뒤 전체 원문 (교정 포함)")
    ingredients: list[ExtractedIngredient] = Field(default_factory=list)
    country_of_origin: str | None = Field(None, description="'원산지:' 라인 원문")
    manufacturing_country: str | None = Field(None, description="제조국 (국가명)")
    manufacturer: str | None = Field(None, description="제조원/제조업자")
    brand_owner: str | None = Field(None, description="책임판매업자/유통전문판매원/수입원")
    allergen_statement: str | None = Field(None, description="'○○ 함유' 알레르기 표시 원문")
    may_contain_statement: str | None = Field(None, description="'같은 제조시설…' 혼입 가능 원문")
    caffeine_mg: float | None = None
    high_caffeine: bool = False
    product_name: str | None = None
    brand: str | None = None
    ocr_corrections: list[str] = Field(default_factory=list, description="'잘못→바름' 교정 목록")


SYSTEM = (
    "당신은 한국 식품·화장품 라벨을 읽어 구조화하는 추출기입니다. "
    "라벨에 실제로 적힌 것만 적고, 적혀 있지 않은 값은 null 로 둡니다. 추정하거나 지어내지 마세요. "
    "OCR 텍스트가 주어지면 이미지와 대조해 오탈자만 교정하고(예: '밀가루(밀:미국산)'), 교정한 내용은 "
    "ocr_corrections 에 '잘못→바름' 형식으로 남깁니다. 원재료는 라벨 표시 순서대로, 괄호 속 원산지는 "
    "origin 에 원문 그대로 둡니다. '외국산' 은 외국산으로 두고 특정 국가로 바꾸지 마세요."
)


def _schema() -> dict:
    s = LabelExtraction.model_json_schema()
    return s


def extract(image_bytes: bytes, media_type: str = "image/jpeg", ocr_text: str | None = None,
            model: str | None = None) -> LabelExtraction | None:
    """API 키가 없거나 실패하면 None (호출자는 정규식 결과로 폴백)."""
    settings = get_settings()
    if not settings.label_extraction_enabled:
        return None
    try:
        import anthropic
    except ImportError:  # pragma: no cover
        return None

    try:
        client = anthropic.Anthropic()
    except anthropic.AnthropicError as e:  # API 키 미설정 등
        log.warning("Anthropic client unavailable (%s) — 정규식 추출로 폴백", e)
        return None
    content: list[dict] = [
        {"type": "image", "source": {"type": "base64", "media_type": media_type,
                                     "data": base64.standard_b64encode(image_bytes).decode()}},
    ]
    if ocr_text:
        content.append({"type": "text", "text": f"OCR 텍스트:\n{ocr_text}"})
    content.append({"type": "text", "text": "이 라벨을 스키마대로 구조화해 주세요."})

    try:
        # 구조화 출력(output_config.format) + 서버측 폴백(안전 분류기 거부 시 다른 모델로 재시도)
        response = client.beta.messages.create(
            model=model or settings.label_extraction_model,
            max_tokens=16000,
            system=SYSTEM,
            messages=[{"role": "user", "content": content}],
            output_config={"effort": "medium",
                           "format": {"type": "json_schema", "schema": _schema()}},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
    except anthropic.AuthenticationError:
        log.warning("ANTHROPIC_API_KEY 없음/무효 — 정규식 추출로 폴백")
        return None
    except anthropic.RateLimitError as e:
        log.warning("Claude rate limited: %s", e)
        return None
    except anthropic.APIStatusError as e:
        log.error("Claude API error %s: %s", e.status_code, e.message)
        return None
    except anthropic.APIConnectionError as e:
        log.error("Claude connection error: %s", e)
        return None

    if response.stop_reason == "refusal":
        log.warning("Claude refused label extraction: %s", getattr(response, "stop_details", None))
        return None
    text = next((b.text for b in response.content if b.type == "text"), None)
    if not text:
        return None
    try:
        return LabelExtraction.model_validate(json.loads(text))
    except (json.JSONDecodeError, ValueError) as e:
        log.error("invalid structured output: %s", e)
        return None
