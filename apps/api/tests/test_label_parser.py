from app.services.label_parser import parse_label_text

LABEL = """제품명: 포기김치
원재료명: 배추(국산), 고춧가루(중국산), 마늘, 새우젓(새우:국산),
정제소금
내용량: 1kg
원산지: 배추 국산, 고춧가루 중국산
제조국: 대한민국
제조원: 테스트식품(주) 전남 해남군
이 제품은 밀, 땅콩을 사용한 제품과 같은 제조시설에서 제조하고 있습니다
고카페인 함유 카페인 함량: 94mg
"""


def test_label_parse_basic():
    r = parse_label_text(LABEL)
    assert r["ingredients_raw"].startswith("배추(국산), 고춧가루(중국산)")
    assert "정제소금" in r["ingredients_raw"]
    assert r["manufacturing_country"] == "대한민국"
    assert r["manufacturer"].startswith("테스트식품")
    assert r["caffeine_mg"] == 94.0 and r["high_caffeine"] is True
    assert "같은 제조시설" in r["may_contain_statement"]
    assert {o["label"] for o in r["origin_lines"]} == {"원산지", "제조국"}
