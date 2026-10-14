"""M2(라벨 기여) · M3(인증/프로필/푸시) · P1-2(대체 제품) 테스트."""

from __future__ import annotations

import httpx
from sqlalchemy import select

from app.db import models as m
from app.pipeline.push import notify_recalls

EXTRACTION = {
    "ingredients_raw": "밀가루(미국산), 팜유(말레이시아산), 설탕, 아스파탐",
    "ingredients": [
        {"name": "밀가루", "origin": "US", "function": None, "sub_ingredients": []},
        {"name": "팜유", "origin": "말레이시아산", "function": None, "sub_ingredients": []},
        {"name": "설탕", "origin": None, "function": None, "sub_ingredients": []},
        {"name": "아스파탐", "origin": None, "function": "감미료", "sub_ingredients": []},
    ],
    "manufacturing_country": "중국",
    "manufacturer": "○○식품유한공사",
    "brand_owner": "△△푸드(주)",
    "caffeine_mg": None,
    "high_caffeine": False,
    "allergen_statement": "밀 함유",
    "may_contain_statement": "땅콩을 사용한 제품과 같은 제조시설에서 제조",
    "allergens_detected": ["wheat"],
    "may_contain_detected": ["peanut"],
}


def _contribute(client, **over):
    body = {"ean13": "8800000000017", "product_name": "테스트 쿠키", "brand": "△△푸드",
            "category": "food", "extraction": EXTRACTION}
    body.update(over)
    return client.post("/v1/contributions/label", json=body)


def test_label_contribution_creates_product_and_verifies_on_threshold(client):
    r = _contribute(client)
    assert r.status_code == 201, r.text
    out = r.json()
    assert out["created"] is True and out["source"] == "ocr_user" and out["confirmations"] == 1

    body = client.get("/v1/products/by-barcode/8800000000017").json()
    assert body["product"]["name"] == "테스트 쿠키"
    texts = [b["text"] for b in body["origin"]["badges"]]
    assert texts[0] == "제조국: 🇨🇳 중국"
    assert "원재료 중 밀가루: 🇺🇸 미국산(라벨 기준)" in texts
    assert "원재료 중 팜유: 🇲🇾 말레이시아산(라벨 기준)" in texts  # 한글 국가명 → 코드 정규화
    assert body["origin"]["oem"] is True  # 제조원 ≠ 책임판매업자
    asp = next(i for i in body["ingredients"] if i["name"] == "아스파탐")
    assert asp["grade"] == 2 and "pku" in asp["applies_to_groups"]
    assert body["allergens"]["contains"] == ["wheat"]
    assert body["allergens"]["may_contain"] == ["peanut"]
    assert body["sources"][-1]["type"] == "ocr_user"

    # 두 번째 동일 제보 → 임계값(테스트 2) 도달 → verified
    r2 = _contribute(client, product_id=out["product_id"])
    assert r2.json()["source"] == "ocr_verified" and r2.json()["confirmations"] == 2
    body = client.get("/v1/products/by-barcode/8800000000017").json()
    assert any(s["type"] == "ocr_verified" and s["confirmations"] == 2 for s in body["sources"])


def test_label_contribution_requires_content(client):
    r = client.post("/v1/contributions/label", json={"extraction": {}})
    assert r.status_code == 422


def test_alternatives_prefers_fewer_hazards_and_kr(client, db, kimchi):
    # 같은 분류(김치류)에 더 나쁜 제품(부분경화유 포함)과 더 좋은 제품(국산)을 추가
    from app.services.product_writer import LabelFacts, upsert_product

    worse, _ = upsert_product(db, LabelFacts(name="나쁜김치", subcategory="김치류", ean13="8800000000024",
                                             ingredients_raw="배추, 부분경화유, 아스파탐",
                                             manufacturing_country="KR"), source="seed")
    better, _ = upsert_product(db, LabelFacts(name="좋은김치", subcategory="김치류", ean13="8800000000031",
                                              ingredients_raw="배추(국산), 고춧가루(국산), 마늘, 정제소금",
                                              manufacturing_country="KR"), source="seed")
    db.commit()
    alts = client.get(f"/v1/products/{kimchi.id}/alternatives").json()["alternatives"]
    names = [a["product"]["name"] for a in alts]
    assert "좋은김치" in names and "나쁜김치" not in names
    assert alts[0]["manufacturing_country"] == "KR"
    assert "제조국 한국" in alts[0]["reason"]


def test_me_requires_auth_and_profiles_roundtrip(client, db, auth_headers):
    assert client.get("/v1/me/profiles").status_code == 401
    assert client.get("/v1/me/profiles", headers={"Authorization": "Bearer bad"}).status_code == 401

    # 동의 없이 보내면 저장하지 않는다
    r = client.put("/v1/me/profiles", headers=auth_headers,
                   json={"label": "나", "payload": '{"allergens":["peanut"]}', "sync_consent": False})
    assert r.status_code == 200 and r.json()["payload"] == ""
    assert client.get("/v1/me/profiles", headers=auth_headers).json() == []

    r = client.put("/v1/me/profiles", headers=auth_headers,
                   json={"label": "나", "payload": '{"allergens":["peanut"],"pregnant":true}',
                         "sync_consent": True})
    assert r.status_code == 200
    pid = r.json()["id"]
    rows = client.get("/v1/me/profiles", headers=auth_headers).json()
    assert rows[0]["payload"] == '{"allergens":["peanut"],"pregnant":true}'
    # DB 에는 평문이 없다(암호화 bytes 만 저장)
    assert b"peanut" not in bytes(db.get(m.Profile, pid).encrypted_payload)
    assert client.delete(f"/v1/me/profiles/{pid}", headers=auth_headers).status_code == 204


def test_scans_sync_dedup(client, auth_headers, kimchi):
    scans = [{"client_id": "c1", "ean13": "8801234567890", "method": "barcode",
              "created_at": "2026-10-14T01:00:00Z"},
             {"client_id": "c2", "ean13": "0000000000000", "method": "barcode",
              "created_at": "2026-10-14T01:01:00Z"}]
    r = client.post("/v1/me/scans", headers=auth_headers, json={"scans": scans})
    assert r.json() == {"added": 2, "skipped": 0}
    r = client.post("/v1/me/scans", headers=auth_headers, json={"scans": scans})
    assert r.json() == {"added": 0, "skipped": 2}
    rows = client.get("/v1/me/scans", headers=auth_headers).json()
    assert rows[0]["product_name"] == "포기김치" or rows[1]["product_name"] == "포기김치"


def test_anonymous_scan_and_device_then_recall_push(client, db, kimchi):
    anon = {"X-Anonymous-Id": "device-anon-0001"}
    assert client.post("/v1/scans", json={"ean13": "8801234567890"}, headers=anon).status_code == 204
    assert client.post("/v1/scans", json={"ean13": "8801234567890"}).status_code == 204  # 식별자 없으면 무시
    r = client.post("/v1/devices", headers=anon,
                    json={"expo_push_token": "ExponentPushToken[abc]", "platform": "android"})
    assert r.status_code == 201
    bad = client.post("/v1/devices", json={"expo_push_token": "nope", "platform": "android"})
    assert bad.status_code == 422

    db.add(m.Recall(mfds_id="r-push", product_name="포기김치", product_id=kimchi.id, reason="이물 혼입"))
    db.commit()

    sent_payloads: list = []

    def handler(request: httpx.Request):
        import json

        sent_payloads.extend(json.loads(request.content))
        return httpx.Response(200, json={"data": [{"status": "ok", "id": "t1"}] * len(sent_payloads)})

    fake = httpx.Client(transport=httpx.MockTransport(handler))
    assert notify_recalls(db, client=fake) == 1
    assert sent_payloads[0]["to"] == "ExponentPushToken[abc]"
    assert "포기김치" in sent_payloads[0]["body"]
    # 두 번째 실행은 중복 발송하지 않는다
    assert notify_recalls(db, client=fake) == 0
    assert db.execute(select(m.RecallNotification)).scalars().one().ticket == "t1"


def test_jwks_es256_token_verified(client, monkeypatch, kimchi):
    """새 Supabase 프로젝트의 비대칭(ES256) 토큰: 공개 JWKS 로 검증되는지 (네트워크 없이 키 주입)."""
    import time

    import jwt
    from cryptography.hazmat.primitives.asymmetric import ec

    import app.auth as auth_mod
    from app.config import get_settings

    priv = ec.generate_private_key(ec.SECP256R1())
    token = jwt.encode({"sub": "aaaaaaaa-0000-0000-0000-000000000001", "aud": "authenticated",
                        "exp": int(time.time()) + 600}, priv, algorithm="ES256", headers={"kid": "k1"})

    class FakeKey:
        key = priv.public_key()

    class FakeJwks:
        def get_signing_key_from_jwt(self, _):
            return FakeKey()

    monkeypatch.setattr(auth_mod, "_jwks_client", lambda: FakeJwks())
    monkeypatch.setattr(get_settings(), "supabase_url", "https://example.supabase.co")
    r = client.get("/v1/me/scans", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200, r.text
    # 잘못된 서명(다른 키) 은 401
    other = ec.generate_private_key(ec.SECP256R1())
    bad = jwt.encode({"sub": "x", "aud": "authenticated", "exp": int(time.time()) + 600}, other,
                     algorithm="ES256", headers={"kid": "k1"})
    assert client.get("/v1/me/scans", headers={"Authorization": f"Bearer {bad}"}).status_code == 401
