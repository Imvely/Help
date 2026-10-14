"""데이터 모델 (docs/04-data-model.md 와 1:1 대응).

읽는 법:
- Mapped[...] 는 "이 파이썬 속성이 DB 컬럼이다"라는 선언입니다.
- relationship() 은 외래키를 따라 객체를 자동으로 이어주는 편의 기능입니다.
- id 는 UUID 문자열(36자)로 통일해 SQLite/Postgres 모두에서 동작하게 했습니다.
"""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    LargeBinary,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import EmbeddingType, JSONType


def new_id() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(UTC)


# ───────────────────────── 제품 ─────────────────────────


class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(300), index=True)
    brand: Mapped[str | None] = mapped_column(String(200))
    manufacturer: Mapped[str | None] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(20), default="food")  # food | cosmetic
    subcategory: Mapped[str | None] = mapped_column(String(100))  # 김치류, 토너 ...
    mfds_report_no: Mapped[str | None] = mapped_column(String(40), index=True)  # 품목제조번호
    image_url: Mapped[str | None] = mapped_column(Text)
    image_recognizable: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    barcodes: Mapped[list[ProductBarcode]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )
    origin: Mapped[ProductOrigin | None] = relationship(
        back_populates="product", uselist=False, cascade="all, delete-orphan"
    )
    ingredients: Mapped[list[ProductIngredient]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductIngredient.rank",
    )
    may_contain: Mapped[list[ProductMayContain]] = relationship(cascade="all, delete-orphan")
    nutrition: Mapped[ProductNutrition | None] = relationship(
        uselist=False, cascade="all, delete-orphan"
    )
    sources: Mapped[list[ProductSource]] = relationship(cascade="all, delete-orphan")
    recalls: Mapped[list[Recall]] = relationship(back_populates="product")
    images: Mapped[list[ProductImage]] = relationship(cascade="all, delete-orphan")


class ProductBarcode(Base):
    __tablename__ = "product_barcodes"

    ean13: Mapped[str] = mapped_column(String(14), primary_key=True)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"))
    source: Mapped[str] = mapped_column(String(30), default="mfds_c005")

    product: Mapped[Product] = relationship(back_populates="barcodes")


class ProductOrigin(Base):
    """원산지는 한 칸이 아니다 (docs/04 §2-1). 레벨별로 따로 저장."""

    __tablename__ = "product_origin"

    product_id: Mapped[str] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), primary_key=True
    )
    declared_origin_country: Mapped[str | None] = mapped_column(String(10))  # 라벨 "원산지"
    manufacturing_country: Mapped[str | None] = mapped_column(String(10))  # 제조국
    manufacturer_name: Mapped[str | None] = mapped_column(String(200))
    manufacturer_country: Mapped[str | None] = mapped_column(String(10))
    brand_owner_name: Mapped[str | None] = mapped_column(String(200))  # 책임판매업자
    brand_owner_country: Mapped[str | None] = mapped_column(String(10))
    oem_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    confidence: Mapped[str] = mapped_column(String(20), default="inferred")  # label_read|ocr|inferred
    source: Mapped[str] = mapped_column(String(30), default="mfds_c002")

    product: Mapped[Product] = relationship(back_populates="origin")


# ───────────────────────── 성분 ─────────────────────────


class Ingredient(Base):
    __tablename__ = "ingredients"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name_ko: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    name_en: Mapped[str | None] = mapped_column(String(200))
    inci_name: Mapped[str | None] = mapped_column(String(200))
    e_number: Mapped[str | None] = mapped_column(String(10), index=True)
    cas: Mapped[str | None] = mapped_column(String(30))
    functions: Mapped[list[str]] = mapped_column(JSONType, default=list)  # 감미료, 보존료 ...
    synonyms: Mapped[list[str]] = mapped_column(JSONType, default=list)

    hazard: Mapped[IngredientHazard | None] = relationship(
        back_populates="ingredient", uselist=False, cascade="all, delete-orphan"
    )
    allergens: Mapped[list[IngredientAllergen]] = relationship(cascade="all, delete-orphan")


class IngredientHazard(Base):
    """등급과 근거를 분리 저장 (docs/05 §2)."""

    __tablename__ = "ingredient_hazard"

    ingredient_id: Mapped[str] = mapped_column(
        ForeignKey("ingredients.id", ondelete="CASCADE"), primary_key=True
    )
    grade: Mapped[int] = mapped_column(Integer)  # 0 안전 1 주의 2 논쟁 3 유해
    evidence_level: Mapped[str] = mapped_column(String(20))  # regulatory|systematic|observational|animal_cell
    regulatory_status: Mapped[dict] = mapped_column(JSONType, default=dict)  # {"KR": "허용", ...}
    applies_to_groups: Mapped[list[str]] = mapped_column(JSONType, default=list)  # child, pku, kidney...
    summary_ko: Mapped[str] = mapped_column(Text)
    source_urls: Mapped[list[str]] = mapped_column(JSONType, default=list)
    last_reviewed: Mapped[date] = mapped_column(Date)

    ingredient: Mapped[Ingredient] = relationship(back_populates="hazard")


class Allergen(Base):
    """알레르겐 온톨로지: 가장 작은 단위를 코드로, 상위는 parent_code 로 (docs/04 §2-3)."""

    __tablename__ = "allergens"

    code: Mapped[str] = mapped_column(String(60), primary_key=True)
    name_ko: Mapped[str] = mapped_column(String(100))
    parent_code: Mapped[str | None] = mapped_column(ForeignKey("allergens.code"))
    synonyms: Mapped[list[str]] = mapped_column(JSONType, default=list)  # 원재료명 매칭용


class AllergenJurisdiction(Base):
    __tablename__ = "allergen_jurisdictions"

    allergen_code: Mapped[str] = mapped_column(ForeignKey("allergens.code"), primary_key=True)
    jurisdiction: Mapped[str] = mapped_column(String(5), primary_key=True)  # KR|EU|US|JP
    mandatory: Mapped[bool] = mapped_column(Boolean, default=True)


class IngredientAllergen(Base):
    __tablename__ = "ingredient_allergens"

    ingredient_id: Mapped[str] = mapped_column(
        ForeignKey("ingredients.id", ondelete="CASCADE"), primary_key=True
    )
    allergen_code: Mapped[str] = mapped_column(ForeignKey("allergens.code"), primary_key=True)


class ProductIngredient(Base):
    __tablename__ = "product_ingredients"
    __table_args__ = (UniqueConstraint("product_id", "rank", name="uq_product_rank"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"))
    ingredient_id: Mapped[str | None] = mapped_column(ForeignKey("ingredients.id"))
    rank: Mapped[int] = mapped_column(Integer)  # 라벨 표시 순서(1부터)
    raw_text: Mapped[str] = mapped_column(Text)  # 라벨 원문 토큰
    function_hint: Mapped[str | None] = mapped_column(String(100))  # 괄호 속 용도
    source: Mapped[str] = mapped_column(String(30), default="mfds_c002")

    product: Mapped[Product] = relationship(back_populates="ingredients")
    ingredient: Mapped[Ingredient | None] = relationship()
    origins: Mapped[list[IngredientOrigin]] = relationship(cascade="all, delete-orphan")


class IngredientOrigin(Base):
    __tablename__ = "ingredient_origins"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    product_ingredient_id: Mapped[str] = mapped_column(
        ForeignKey("product_ingredients.id", ondelete="CASCADE")
    )
    country: Mapped[str] = mapped_column(String(10))  # KR|CN|US|외국산|unknown
    raw_text: Mapped[str | None] = mapped_column(String(200))
    source: Mapped[str] = mapped_column(String(30), default="label")
    confirmations: Mapped[int] = mapped_column(Integer, default=0)


class ProductMayContain(Base):
    """'혼입 가능' 은 '포함' 과 다르므로 따로 저장."""

    __tablename__ = "product_may_contain"

    product_id: Mapped[str] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), primary_key=True
    )
    allergen_code: Mapped[str] = mapped_column(ForeignKey("allergens.code"), primary_key=True)


class ProductNutrition(Base):
    __tablename__ = "product_nutrition"

    product_id: Mapped[str] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), primary_key=True
    )
    serving_g: Mapped[float | None] = mapped_column(Numeric(8, 2))
    serving_ml: Mapped[float | None] = mapped_column(Numeric(8, 2))
    kcal: Mapped[float | None] = mapped_column(Numeric(8, 2))
    sodium_mg: Mapped[float | None] = mapped_column(Numeric(8, 2))
    sugar_g: Mapped[float | None] = mapped_column(Numeric(8, 2))
    sat_fat_g: Mapped[float | None] = mapped_column(Numeric(8, 2))
    trans_fat_g: Mapped[float | None] = mapped_column(Numeric(8, 2))
    protein_g: Mapped[float | None] = mapped_column(Numeric(8, 2))
    caffeine_mg: Mapped[float | None] = mapped_column(Numeric(8, 2))
    high_caffeine: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str] = mapped_column(String(30), default="mfds_nutrition")


class ProductSource(Base):
    """모든 사실 필드의 출처 (docs/04 §2-6). UI '출처' 줄은 여기서 만든다."""

    __tablename__ = "product_sources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"))
    type: Mapped[str] = mapped_column(String(30))  # mfds_c002 | ocr_user | ocr_verified ...
    date: Mapped[date | None] = mapped_column(Date)
    confirmations: Mapped[int] = mapped_column(Integer, default=0)
    ref: Mapped[str | None] = mapped_column(String(200))  # 품목보고번호, OCR job id 등


class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"))
    storage_key: Mapped[str] = mapped_column(String(300))
    embedding: Mapped[list[float] | None] = mapped_column(EmbeddingType(512))
    model_version: Mapped[str] = mapped_column(String(50), index=True)
    source: Mapped[str] = mapped_column(String(30), default="user_barcode_session")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


# ───────────────────────── 회수 ─────────────────────────


class Recall(Base):
    __tablename__ = "recalls"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    product_id: Mapped[str | None] = mapped_column(ForeignKey("products.id"), index=True)
    mfds_id: Mapped[str | None] = mapped_column(String(60), unique=True)
    product_name: Mapped[str] = mapped_column(String(300))
    company_name: Mapped[str | None] = mapped_column(String(200))
    barcode: Mapped[str | None] = mapped_column(String(14), index=True)
    report_no: Mapped[str | None] = mapped_column(String(40), index=True)
    reason: Mapped[str | None] = mapped_column(Text)
    grade: Mapped[str | None] = mapped_column(String(30))
    issued_at: Mapped[date | None] = mapped_column(Date)
    raw: Mapped[dict] = mapped_column(JSONType, default=dict)

    product: Mapped[Product | None] = relationship(back_populates="recalls")


# ───────────────────────── 사용자 ─────────────────────────


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # Supabase auth.users.id
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Profile(Base):
    """민감정보는 암호화된 payload 로만 저장 — 검색 불가 구조 (docs/04 §2-5)."""

    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(50), default="나")
    encrypted_payload: Mapped[bytes] = mapped_column(LargeBinary)
    sync_consent: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True)  # 비회원 null
    product_id: Mapped[str | None] = mapped_column(ForeignKey("products.id"))
    method: Mapped[str] = mapped_column(String(20))  # barcode|vision|ocr|search
    latency_ms: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Correction(Base):
    __tablename__ = "corrections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), index=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    field: Mapped[str] = mapped_column(String(60))
    proposed_value: Mapped[str] = mapped_column(Text)
    evidence_url: Mapped[str | None] = mapped_column(Text)
    note: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="open")  # open|accepted|rejected
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


# ───────────────────────── 원천 데이터(raw) ─────────────────────────


class RawMfdsRecord(Base):
    """식약처 API 원본 보존 (재처리·출처 추적용). service: C002 | I0490 | ..."""

    __tablename__ = "raw_mfds_records"
    __table_args__ = (UniqueConstraint("service", "record_key", name="uq_raw_service_key"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    service: Mapped[str] = mapped_column(String(10), index=True)
    record_key: Mapped[str] = mapped_column(String(120))
    payload: Mapped[dict] = mapped_column(JSONType)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
