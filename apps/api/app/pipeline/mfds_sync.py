"""식약처 데이터 → raw 보존 → 정규화 (docs/03 §6-1).

서비스별 키 필드:
- C002 (품목제조보고·원재료): PRDLST_REPORT_NO(품목제조번호), PRDLST_NM, BSSH_NM, PRDLST_DCNM(식품유형),
        RAWMTRL_NM(원재료명), CHNG_DT, LCNS_NO
- C005 (바코드연계): BAR_CD, PRDLST_REPORT_NO, PRDLST_NM, BSSH_NM, PRDLST_DCNM (2018년 이후 갱신 중단)
- I0490 (회수·판매중지): PRDTNM, BSSHNM, BRCDNO, PRDLST_REPORT_NO, RTRVLPRVNS(사유), RTRVL_GRDCD_NM(등급),
        MNFDT(제조일), CRET_DTM

실행 예:
  python -m app.pipeline.mfds_sync dump C002 --max-rows 5000
  python -m app.pipeline.mfds_sync normalize
  python -m app.pipeline.mfds_sync recalls
"""

from __future__ import annotations

import argparse
import logging
from datetime import UTC, date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import models as m
from app.pipeline.mfds_client import MfdsClient
from app.services.allergen_matcher import match_allergens
from app.services.ingredient_parser import ParsedIngredient, flatten_names, parse_ingredients

log = logging.getLogger(__name__)

KEY_FIELDS = {"C002": "PRDLST_REPORT_NO", "C005": "BAR_CD", "I0490": None}


def record_key(service: str, row: dict) -> str:
    f = KEY_FIELDS.get(service)
    if f and row.get(f):
        return str(row[f])
    # I0490 은 고유키가 없어 조합으로 만든다
    return "|".join(str(row.get(k, "")) for k in ("PRDTNM", "BSSHNM", "CRET_DTM", "BRCDNO"))


def store_raw(db: Session, service: str, rows: list[dict]) -> int:
    n = 0
    for row in rows:
        key = record_key(service, row)
        existing = db.execute(
            select(m.RawMfdsRecord).where(m.RawMfdsRecord.service == service,
                                          m.RawMfdsRecord.record_key == key)
        ).scalar_one_or_none()
        if existing:
            if existing.payload != row:
                existing.payload = row
                existing.fetched_at = datetime.now(UTC)
                existing.processed_at = None
        else:
            db.add(m.RawMfdsRecord(service=service, record_key=key, payload=row))
        n += 1
    db.commit()
    return n


def dump(service: str, max_rows: int | None = None, start: int = 1,
         filters: dict[str, str] | None = None) -> int:
    s = get_settings()
    if not s.mfds_api_key:
        raise SystemExit("EODISAN_MFDS_API_KEY 가 필요합니다")
    from app.db.base import SessionLocal

    client = MfdsClient(s.mfds_api_key, s.mfds_base_url)
    total = 0
    batch: list[dict] = []
    with SessionLocal() as db:
        for row in client.iter_all(service, filters=filters, start=start, max_rows=max_rows):
            batch.append(row)
            if len(batch) >= 500:
                total += store_raw(db, service, batch)
                batch = []
        if batch:
            total += store_raw(db, service, batch)
    return total


# ───────────── 정규화 ─────────────


def _ingredient_index(db: Session) -> dict[str, m.Ingredient]:
    """이름/동의어 → Ingredient. 공백 제거·소문자 기준."""
    idx: dict[str, m.Ingredient] = {}
    for ing in db.execute(select(m.Ingredient)).scalars():
        for key in [ing.name_ko, *(ing.synonyms or [])]:
            idx[key.replace(" ", "").lower()] = ing
    return idx


def _allergen_synonyms(db: Session) -> dict[str, list[str]]:
    return {a.code: [a.name_ko, *(a.synonyms or [])] for a in db.execute(select(m.Allergen)).scalars()}


def _match_ingredient(idx: dict[str, m.Ingredient], name: str) -> m.Ingredient | None:
    k = name.replace(" ", "").lower()
    if k in idx:
        return idx[k]
    # 'L-글루탐산나트륨(향미증진제)' 같이 괄호 앞 이름, 또는 사전 키가 포함된 경우
    for key, ing in idx.items():
        if len(key) >= 3 and key in k:
            return ing
    return None


def upsert_product_from_c002(db: Session, row: dict, idx: dict[str, m.Ingredient],
                             allergen_syn: dict[str, list[str]]) -> m.Product:
    report_no = str(row.get("PRDLST_REPORT_NO") or "").strip()
    product = None
    if report_no:
        product = db.execute(
            select(m.Product).where(m.Product.mfds_report_no == report_no)
        ).scalar_one_or_none()
    if not product:
        product = m.Product(name=row.get("PRDLST_NM", "").strip() or "(이름 없음)",
                            mfds_report_no=report_no or None)
        db.add(product)
    product.name = row.get("PRDLST_NM", product.name).strip()
    product.manufacturer = (row.get("BSSH_NM") or "").strip() or product.manufacturer
    product.brand = product.brand or product.manufacturer
    product.subcategory = (row.get("PRDLST_DCNM") or "").strip() or product.subcategory
    product.category = "food"
    db.flush()

    # 원재료 재구성 (기존 C002 유래 항목은 교체)
    for pi in list(product.ingredients):
        if pi.source == "mfds_c002":
            product.ingredients.remove(pi)
            db.delete(pi)
    db.flush()
    parsed = parse_ingredients(row.get("RAWMTRL_NM"))
    for rank, item in enumerate(parsed, start=1):
        _add_product_ingredient(db, product, item, rank, idx)

    # 알레르겐 텍스트 매칭(혼입 가능은 C002 에 없음)
    names = flatten_names(parsed)
    hits = {h.code for h in match_allergens(names, allergen_syn)}
    # 포함 알레르겐은 응답 시 성분·동의어로 다시 계산하므로 여기선 저장 생략(출처만 기록)
    _ = hits

    # 원산지: C002 에는 완제품 원산지가 없다 → 제조원 주소가 없어 unknown. 국내 보고건이므로 제조국 KR 추정.
    if not product.origin:
        product.origin = m.ProductOrigin(manufacturing_country="KR",
                                         manufacturer_name=product.manufacturer,
                                         manufacturer_country="KR", confidence="inferred",
                                         source="mfds_c002")
    _touch_source(db, product, "mfds_c002", row.get("CHNG_DT") or row.get("PRMS_DT"), report_no)
    return product


def _add_product_ingredient(db: Session, product: m.Product, item: ParsedIngredient, rank: int,
                            idx: dict[str, m.Ingredient]) -> None:
    ing = _match_ingredient(idx, item.name)
    # relationship 컬렉션에 append 해야 같은 세션 안에서 바로 응답 조립에 반영된다.
    pi = m.ProductIngredient(ingredient_id=ing.id if ing else None, rank=rank, raw_text=item.raw,
                             function_hint=item.function_hint, source="mfds_c002")
    product.ingredients.append(pi)
    if item.origin:
        pi.origins.append(m.IngredientOrigin(country=item.origin, raw_text=item.origin_raw,
                                             source="label", confirmations=1))
    db.flush()


def _touch_source(db: Session, product: m.Product, type_: str, dt: str | None, ref: str | None):
    d = _parse_date(dt)
    for s in product.sources:
        if s.type == type_:
            s.date = d or s.date
            s.ref = ref or s.ref
            return
    product.sources.append(m.ProductSource(type=type_, date=d, ref=ref))


def _parse_date(v: str | None) -> date | None:
    if not v:
        return None
    v = str(v).strip()[:8]
    try:
        return datetime.strptime(v, "%Y%m%d").date()
    except ValueError:
        return None


def normalize(limit: int | None = None) -> dict[str, int]:
    from app.db.base import SessionLocal

    counts = {"products": 0, "barcodes": 0}
    with SessionLocal() as db:
        idx = _ingredient_index(db)
        asyn = _allergen_synonyms(db)
        stmt = select(m.RawMfdsRecord).where(m.RawMfdsRecord.service == "C002",
                                             m.RawMfdsRecord.processed_at.is_(None))
        if limit:
            stmt = stmt.limit(limit)
        for raw in db.execute(stmt).scalars().all():
            upsert_product_from_c002(db, raw.payload, idx, asyn)
            raw.processed_at = datetime.now(UTC)
            counts["products"] += 1
            if counts["products"] % 200 == 0:
                db.commit()
        db.commit()

        # C005: 바코드 ↔ 품목제조번호
        stmt = select(m.RawMfdsRecord).where(m.RawMfdsRecord.service == "C005",
                                             m.RawMfdsRecord.processed_at.is_(None))
        for raw in db.execute(stmt).scalars().all():
            row = raw.payload
            ean = str(row.get("BAR_CD") or "").strip()
            rep = str(row.get("PRDLST_REPORT_NO") or "").strip()
            if ean and rep:
                p = db.execute(select(m.Product).where(m.Product.mfds_report_no == rep)).scalar_one_or_none()
                if p and not db.get(m.ProductBarcode, ean):
                    db.add(m.ProductBarcode(ean13=ean, product_id=p.id, source="mfds_c005"))
                    counts["barcodes"] += 1
            raw.processed_at = datetime.now(UTC)
        db.commit()
    return counts


def sync_recalls() -> int:
    """I0490 raw → recalls 테이블. 바코드/품목보고번호로 제품에 연결."""
    from app.db.base import SessionLocal

    n = 0
    with SessionLocal() as db:
        stmt = select(m.RawMfdsRecord).where(m.RawMfdsRecord.service == "I0490",
                                             m.RawMfdsRecord.processed_at.is_(None))
        for raw in db.execute(stmt).scalars().all():
            row = raw.payload
            key = raw.record_key
            rec = db.execute(select(m.Recall).where(m.Recall.mfds_id == key)).scalar_one_or_none()
            if not rec:
                rec = m.Recall(mfds_id=key, product_name=row.get("PRDTNM", ""))
                db.add(rec)
            rec.company_name = row.get("BSSHNM")
            rec.barcode = (row.get("BRCDNO") or "").strip() or None
            rec.report_no = (row.get("PRDLST_REPORT_NO") or "").strip() or None
            rec.reason = row.get("RTRVLPRVNS")
            rec.grade = row.get("RTRVL_GRDCD_NM")
            rec.issued_at = _parse_date(row.get("CRET_DTM")) or _parse_date(row.get("MNFDT"))
            rec.raw = row
            # 제품 연결
            if rec.barcode:
                b = db.get(m.ProductBarcode, rec.barcode)
                if b:
                    rec.product_id = b.product_id
            if not rec.product_id and rec.report_no:
                p = db.execute(
                    select(m.Product).where(m.Product.mfds_report_no == rec.report_no)
                ).scalar_one_or_none()
                if p:
                    rec.product_id = p.id
            raw.processed_at = datetime.now(UTC)
            n += 1
        db.commit()
    return n


def main(argv: list[str] | None = None) -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    ap = argparse.ArgumentParser(description="식약처 데이터 동기화")
    sub = ap.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("dump", help="OpenAPI 전체/부분 덤프 → raw 테이블")
    d.add_argument("service", choices=["C002", "C005", "I0490"])
    d.add_argument("--max-rows", type=int)
    d.add_argument("--start", type=int, default=1)
    d.add_argument("--since", help="YYYYMMDD, CHNG_DT 증분 (최근 7일만 가능)")
    sub.add_parser("normalize", help="raw C002/C005 → products")
    sub.add_parser("recalls", help="raw I0490 → recalls")
    args = ap.parse_args(argv)

    from app.db.base import Base, engine

    Base.metadata.create_all(engine)
    if args.cmd == "dump":
        filters = {"CHNG_DT": args.since} if args.since else None
        print("stored", dump(args.service, args.max_rows, args.start, filters))
    elif args.cmd == "normalize":
        print(normalize())
    elif args.cmd == "recalls":
        print("recalls", sync_recalls())


if __name__ == "__main__":
    main()
