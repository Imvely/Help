from app.db import models as m


def test_healthz(client):
    assert client.get("/healthz").json()["ok"] is True


def test_by_barcode_full_response(client, kimchi):
    r = client.get("/v1/products/by-barcode/8801234567890")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["product"]["name"] == "포기김치"
    assert body["product"]["subcategory"] == "김치류"
    # 원산지: 레벨별 배지
    texts = [b["text"] for b in body["origin"]["badges"]]
    assert "제조국: 🇰🇷 한국" in texts
    assert "원재료 중 고춧가루: 🇨🇳 중국산(라벨 기준)" in texts
    assert any("표시 의무 없음" in t for t in texts)
    assert body["origin"]["disclaimer"].startswith("원산지·제조국은 안전이나 품질을")
    # 성분: MSG 는 사전 매칭 → 등급 0
    msg = next(i for i in body["ingredients"] if i["name"] == "L-글루탐산나트륨")
    assert msg["grade"] == 0 and msg["evidence"] == "regulatory"
    assert body["grade_summary"]["0"] >= 3 and body["grade_summary"]["unknown"] >= 1
    # 알레르기: 새우(동의어 새우젓), 밀(밀가루) 포함. 혼입가능 밀은 포함으로 승격돼 사라짐
    assert "shellfish.crustacean.shrimp" in body["allergens"]["contains"]
    assert "wheat" in body["allergens"]["contains"]
    assert body["allergens"]["may_contain"] == []
    assert body["allergens"]["labels"]["wheat"] == "밀"
    assert body["nutrition"]["sodium_mg"] == 620
    assert body["recall"] is None
    assert body["sources"][0]["type"] == "mfds_c002"
    assert r.headers["cache-control"].startswith("public")


def test_upc_a_normalization(client, kimchi):
    # 12자리 UPC-A → 앞에 0 → 0880123456789 는 다른 코드이므로 404 (정규화 자체는 422 가 아님)
    r = client.get("/v1/products/by-barcode/880123456789")
    assert r.status_code == 404
    assert r.headers["content-type"].startswith("application/problem+json")


def test_invalid_barcode_422(client):
    assert client.get("/v1/products/by-barcode/abc").status_code == 422


def test_oem_origin_and_caffeine(client, energy_drink):
    body = client.get("/v1/products/by-barcode/8809876543210").json()
    texts = [b["text"] for b in body["origin"]["badges"]]
    assert texts[0] == "제조국: 🇨🇳 중국"
    assert texts[1] == "브랜드: 🇰🇷 한국 (OEM)"
    assert body["origin"]["oem"] is True
    assert body["nutrition"]["caffeine_mg"] == 94 and body["nutrition"]["high_caffeine"] is True
    assert body["sources"][0] == {"type": "ocr_verified", "date": "2026-09-14", "confirmations": 3}


def test_recall_attached_by_barcode(client, db, kimchi):
    db.add(m.Recall(mfds_id="r1", product_name="포기김치", barcode="8801234567890",
                    reason="대장균군 기준 부적합", grade="2등급"))
    db.commit()
    body = client.get("/v1/products/by-barcode/8801234567890").json()
    assert body["recall"]["reason"] == "대장균군 기준 부적합"
    assert client.get("/v1/recalls").json()[0]["product_name"] == "포기김치"


def test_search(client, kimchi):
    hits = client.get("/v1/products/search", params={"q": "김치"}).json()["hits"]
    assert hits and hits[0]["name"] == "포기김치"


def test_kb_endpoints(client):
    rows = client.get("/v1/kb/ingredients", params={"q": "아스파탐"}).json()
    assert rows[0]["grade"] == 2 and rows[0]["e_number"] == "E951"
    detail = client.get(f"/v1/kb/ingredients/{rows[0]['id']}").json()
    assert detail["source_urls"]
    kr = client.get("/v1/kb/allergens", params={"jurisdiction": "KR"}).json()
    assert any(a["code"] == "peach" for a in kr)


def test_correction_flow(client, kimchi):
    r = client.post("/v1/contributions/corrections", json={
        "product_id": kimchi.id, "field": "ingredient_origin",
        "proposed_value": "고춧가루: 국산 (2026년 9월 생산분)", "note": "라벨 사진 첨부"})
    assert r.status_code == 201 and r.json()["status"] == "open"
    bad = client.post("/v1/contributions/corrections", json={
        "product_id": kimchi.id, "field": "nope", "proposed_value": "x"})
    assert bad.status_code == 422


def test_recognize_without_model_is_501(client):
    r = client.post("/v1/recognize", files={"image": ("a.webp", b"xx", "image/webp")})
    assert r.status_code == 501


def test_recognize_with_embedding_brute_force(client, db, kimchi):
    db.add(m.ProductImage(product_id=kimchi.id, storage_key="k", embedding=[1.0, 0.0, 0.0],
                          model_version="test-v0"))
    db.add(m.ProductImage(product_id=kimchi.id, storage_key="k2", embedding=[0.9, 0.1, 0.0],
                          model_version="test-v0"))
    db.commit()
    r = client.post("/v1/recognize", data={"embedding": "[1,0,0]", "model_version": "test-v0"})
    body = r.json()
    assert body["candidates"][0]["product"]["name"] == "포기김치"
    assert body["candidates"][0]["votes"] == 2 and body["confident"] is True


def test_ocr_debug_text_path(client):
    r = client.post("/v1/ocr/label", data={"text": "원재료명: 배추(국산), 고춧가루(중국산), 새우젓\n내용량: 1kg"},
                    files={"image": ("l.jpg", b"\xff\xd8\xff", "image/jpeg")})
    assert r.status_code == 202
    job_id = r.json()["job_id"]
    job = client.get(f"/v1/ocr/jobs/{job_id}").json()  # 인라인 처리 후 done
    assert job["status"] == "done", job
    res = job["result"]
    assert res["extraction_method"] == "regex"  # 테스트에선 Claude 비활성
    assert res["ingredients"][1] == {"name": "고춧가루", "origin": "CN", "function": None,
                                     "sub_ingredients": []}
    assert "shellfish.crustacean.shrimp" in res["allergens_detected"]
