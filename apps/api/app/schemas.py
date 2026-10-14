"""API 응답/요청 스키마 (pydantic). docs/06-api-and-ml.md §2 예시와 일치시킨다.

pydantic 모델은 "이 JSON 은 이런 모양이어야 한다"는 계약서입니다. FastAPI 가 자동으로
검증·직렬화하고 OpenAPI 문서도 만들어 줍니다. 앱(TypeScript) 타입은 이 스키마에서 생성합니다.
"""

from __future__ import annotations

from datetime import date as dt_date
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

EvidenceLevel = Literal["regulatory", "systematic", "observational", "animal_cell"]


class ProductBrief(BaseModel):
    id: str
    name: str
    brand: str | None = None
    manufacturer: str | None = None
    category: str
    subcategory: str | None = None
    image_url: str | None = None


class IngredientOriginOut(BaseModel):
    name: str
    rank: int
    country: str | None = None  # KR|CN|...|외국산|unknown
    source: str | None = None
    text: str  # 배지 문구 (docs/05 §7)


class OriginBadgeOut(BaseModel):
    level: str
    text: str
    country: str | None = None
    ingredient: str | None = None


class OriginOut(BaseModel):
    declared_origin_country: str | None = None
    manufacturing_country: str | None = None
    manufacturer_name: str | None = None
    brand_owner_name: str | None = None
    brand_owner_country: str | None = None
    oem: bool = False
    confidence: str = "inferred"
    ingredients: list[IngredientOriginOut] = []
    undisclosed_note: str | None = None
    badges: list[OriginBadgeOut] = []
    disclaimer: str


class IngredientOut(BaseModel):
    id: str | None = None
    name: str
    rank: int
    function: str | None = None
    grade: int | None = None  # 0..3, None=미확인
    evidence: EvidenceLevel | None = None
    applies_to_groups: list[str] = []
    summary: str | None = None
    regulatory_status: dict[str, str] = {}
    sub_ingredients: list[str] = []


class GradeSummary(BaseModel):
    g0: int = Field(0, alias="0")
    g1: int = Field(0, alias="1")
    g2: int = Field(0, alias="2")
    g3: int = Field(0, alias="3")
    unknown: int = 0

    model_config = {"populate_by_name": True}


class AllergensOut(BaseModel):
    contains: list[str] = []
    may_contain: list[str] = []
    labels: dict[str, str] = {}  # code → 한글


class NutritionOut(BaseModel):
    per_serving_g: float | None = None
    per_serving_ml: float | None = None
    kcal: float | None = None
    sodium_mg: float | None = None
    sugar_g: float | None = None
    sat_fat_g: float | None = None
    trans_fat_g: float | None = None
    protein_g: float | None = None
    caffeine_mg: float | None = None
    high_caffeine: bool = False
    source: str | None = None


class RecallOut(BaseModel):
    id: str
    reason: str | None = None
    grade: str | None = None
    issued_at: dt_date | None = None
    product_name: str
    company_name: str | None = None


class SourceOut(BaseModel):
    type: str
    date: dt_date | None = None
    confirmations: int = 0


class ProductResponse(BaseModel):
    product: ProductBrief
    origin: OriginOut
    ingredients: list[IngredientOut]
    grade_summary: GradeSummary
    allergens: AllergensOut
    nutrition: NutritionOut | None = None
    recall: RecallOut | None = None
    sources: list[SourceOut]
    generated_at: datetime


class SearchHit(BaseModel):
    id: str
    name: str
    brand: str | None = None
    category: str
    image_url: str | None = None


class SearchResponse(BaseModel):
    query: str
    hits: list[SearchHit]


class IngredientDetail(BaseModel):
    id: str
    name_ko: str
    name_en: str | None = None
    e_number: str | None = None
    functions: list[str] = []
    grade: int | None = None
    evidence: EvidenceLevel | None = None
    regulatory_status: dict[str, str] = {}
    applies_to_groups: list[str] = []
    summary: str | None = None
    source_urls: list[str] = []
    last_reviewed: dt_date | None = None
    allergens: list[str] = []


class CorrectionIn(BaseModel):
    product_id: str
    field: str = Field(..., max_length=60)
    proposed_value: str = Field(..., max_length=2000)
    evidence_url: str | None = None
    note: str | None = Field(None, max_length=2000)


class CorrectionOut(BaseModel):
    id: str
    status: str
    created_at: datetime


class RecognizeCandidate(BaseModel):
    product: ProductBrief
    similarity: float
    votes: int


class RecognizeResponse(BaseModel):
    model_version: str
    candidates: list[RecognizeCandidate]
    confident: bool


class OcrJobOut(BaseModel):
    job_id: str
    status: Literal["queued", "running", "done", "failed"]
    result: dict | None = None
    error: str | None = None


class ExtractedIngredientIn(BaseModel):
    name: str = Field(..., max_length=200)
    origin: str | None = None  # KR|CN|...|외국산|unknown|None
    function: str | None = None
    sub_ingredients: list[str] = []


class LabelExtractionIn(BaseModel):
    """앱이 확인·수정해 보내는 라벨 정보 (ocr_worker.build_result 와 같은 모양)."""

    ingredients_raw: str | None = None
    ingredients: list[ExtractedIngredientIn] = []
    manufacturing_country: str | None = None
    manufacturer: str | None = None
    brand_owner: str | None = None
    caffeine_mg: float | None = None
    high_caffeine: bool = False
    allergen_statement: str | None = None
    may_contain_statement: str | None = None
    allergens_detected: list[str] = []
    may_contain_detected: list[str] = []


class LabelContributionIn(BaseModel):
    job_id: str | None = None
    ean13: str | None = None
    product_id: str | None = None
    product_name: str | None = Field(None, max_length=300)
    brand: str | None = Field(None, max_length=200)
    category: Literal["food", "cosmetic"] = "food"
    extraction: LabelExtractionIn


class LabelContributionOut(BaseModel):
    product_id: str
    created: bool
    source: str  # ocr_user | ocr_verified
    confirmations: int


class AlternativeOut(BaseModel):
    product: ProductBrief
    grade_summary: GradeSummary
    manufacturing_country: str | None = None
    reason: str


class AlternativesResponse(BaseModel):
    alternatives: list[AlternativeOut]


class Problem(BaseModel):
    """RFC 9457 application/problem+json"""

    type: str = "about:blank"
    title: str
    status: int
    detail: str | None = None
