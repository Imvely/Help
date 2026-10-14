"""테스트 공통 픽스처.

- 인메모리 SQLite 로 전체 스키마 생성 + KB 시드 적재.
- FastAPI 의 get_db 의존성을 테스트 세션으로 바꿔치기(override).
- 샘플 제품(김치) 1개를 넣어 API 테스트에 사용.
"""

from __future__ import annotations

import os
import tempfile
from datetime import date

import pytest

# 설정은 import 시점에 읽히므로 app 을 import 하기 전에 환경을 고정한다.
os.environ.setdefault("EODISAN_LABEL_EXTRACTION_ENABLED", "0")  # 테스트에서 Claude 호출 금지
os.environ.setdefault("EODISAN_UPLOAD_DIR", tempfile.mkdtemp(prefix="eodisan-uploads-"))
os.environ.setdefault("EODISAN_SUPABASE_JWT_SECRET", "test-secret-test-secret-test-secret-1234")
os.environ.setdefault("EODISAN_PROFILE_ENCRYPTION_KEY", "Zm9vYmFyYmF6cXV4Zm9vYmFyYmF6cXV4Zm9vYmFyYmE=")
os.environ.setdefault("EODISAN_LABEL_VERIFY_THRESHOLD", "2")
from fastapi.testclient import TestClient
from sqlalchemy import StaticPool, create_engine, event, select
from sqlalchemy.orm import Session

from app.db import models as m
from app.db.base import Base, get_db
from app.kb.loader import load_all
from app.main import app
from app.pipeline.mfds_sync import _allergen_synonyms, _ingredient_index, upsert_product_from_c002


@pytest.fixture(scope="session")
def engine():
    e = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)

    # pysqlite 는 기본적으로 BEGIN 을 늦게 보내 SAVEPOINT 가 깨진다 → SQLAlchemy 공식 우회책
    @event.listens_for(e, "connect")
    def _no_autobegin(dbapi_conn, _):
        dbapi_conn.isolation_level = None

    @event.listens_for(e, "begin")
    def _begin(conn):
        conn.exec_driver_sql("BEGIN")

    Base.metadata.create_all(e)
    with Session(e) as s:
        load_all(s)
    return e


@pytest.fixture
def db(engine):
    conn = engine.connect()
    tx = conn.begin()
    # 테스트 안의 commit 은 SAVEPOINT 로 흡수 → 테스트 끝나면 바깥 트랜잭션을 롤백해 전부 되돌린다
    s = Session(bind=conn, expire_on_commit=False, join_transaction_mode="create_savepoint")
    yield s
    s.close()
    tx.rollback()
    conn.close()


@pytest.fixture
def client(db, monkeypatch):
    app.dependency_overrides[get_db] = lambda: db
    # OCR 인라인 처리(BackgroundTasks)가 쓰는 세션도 같은 테스트 커넥션에 묶는다
    import app.routers.ocr as ocr_router

    monkeypatch.setattr(ocr_router, "SessionLocal",
                        lambda: Session(bind=db.get_bind(), expire_on_commit=False,
                                        join_transaction_mode="create_savepoint"))
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers():
    """Supabase 형식 JWT (HS256, aud=authenticated)."""
    import time

    import jwt

    token = jwt.encode({"sub": "11111111-2222-3333-4444-555555555555", "aud": "authenticated",
                        "email": "u@example.com", "exp": int(time.time()) + 3600},
                       os.environ["EODISAN_SUPABASE_JWT_SECRET"], algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


KIMCHI_C002 = {
    "PRDLST_REPORT_NO": "20200123456",
    "PRDLST_NM": "포기김치",
    "BSSH_NM": "테스트식품(주)",
    "PRDLST_DCNM": "김치류",
    "RAWMTRL_NM": "배추(국산), 고춧가루(중국산), 마늘, 새우젓(새우:국산), 정제소금, "
                  "L-글루탐산나트륨(향미증진제), 설탕, 밀가루(밀:미국산)",
    "CHNG_DT": "20250302",
}


@pytest.fixture
def kimchi(db):
    idx = _ingredient_index(db)
    asyn = _allergen_synonyms(db)
    p = upsert_product_from_c002(db, KIMCHI_C002, idx, asyn)
    db.add(m.ProductBarcode(ean13="8801234567890", product_id=p.id, source="test"))
    wheat = db.execute(select(m.Allergen).where(m.Allergen.code == "wheat")).scalar_one()
    db.add(m.ProductMayContain(product_id=p.id, allergen_code=wheat.code))
    db.add(m.ProductNutrition(product_id=p.id, serving_g=100, kcal=30, sodium_mg=620, sugar_g=3,
                              source="test"))
    db.commit()
    return p


@pytest.fixture
def energy_drink(db):
    p = m.Product(name="에너지드링크 250mL", brand="테스트음료", category="food", subcategory="탄산음료")
    db.add(p)
    db.flush()
    db.add(m.ProductBarcode(ean13="8809876543210", product_id=p.id, source="test"))
    db.add(m.ProductOrigin(product_id=p.id, manufacturing_country="CN", brand_owner_country="KR",
                           brand_owner_name="테스트음료", oem_flag=True, confidence="label_read",
                           source="ocr_verified"))
    db.add(m.ProductNutrition(product_id=p.id, serving_ml=250, caffeine_mg=94, high_caffeine=True,
                              sugar_g=27, source="ocr_user"))
    db.add(m.ProductSource(product_id=p.id, type="ocr_verified", date=date(2026, 9, 14),
                           confirmations=3))
    db.commit()
    return p
