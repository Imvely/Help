from app.services.allergen_matcher import extract_may_contain, match_allergens
from app.services.caffeine import daily_limit_mg, is_high_caffeine
from app.services.origin import build_badges, ingredient_origin_text, involves_country

SYN = {
    "egg": ["알류", "계란", "난백"],
    "milk": ["우유", "유청", "탈지분유"],
    "peanut": ["땅콩"],
    "wheat": ["밀", "밀가루"],
    "shellfish.crustacean.shrimp": ["새우", "새우젓"],
}


def test_match_allergens_by_synonym():
    hits = {h.code for h in match_allergens(["난백분말", "탈지분유", "정제소금"], SYN)}
    assert hits == {"egg", "milk"}


def test_match_allergens_substring_in_raw():
    hits = {h.code for h in match_allergens(["새우젓(새우:국산)"], SYN)}
    assert hits == {"shellfish.crustacean.shrimp"}


def test_may_contain_requires_statement_pattern():
    s = "이 제품은 땅콩, 우유를 사용한 제품과 같은 제조시설에서 제조하고 있습니다"
    assert extract_may_contain(s, SYN) == ["milk", "peanut"]
    assert extract_may_contain("땅콩 함유", SYN) == []  # '포함' 문구는 혼입가능이 아님


def test_origin_text_rules():
    assert ingredient_origin_text("고춧가루", "CN") == "원재료 중 고춧가루: 🇨🇳 중국산(라벨 기준)"
    assert ingredient_origin_text("마늘", None) == "마늘: 표시 의무 없음 · 알 수 없음"
    assert ingredient_origin_text("대두", "외국산") == "대두: 외국산(국가 변동 원료, 법상 허용 표기)"


def test_badges_oem_and_unknown():
    badges = build_badges("CN", "KR", True, [("고춧가루", "CN", "label"), ("마늘", None, None)], 2)
    texts = [b.text for b in badges]
    assert texts[0] == "제조국: 🇨🇳 중국"
    assert texts[1] == "브랜드: 🇰🇷 한국 (OEM)"
    assert "원재료 중 고춧가루: 🇨🇳 중국산(라벨 기준)" in texts
    assert "2개 원료는 표시 의무 없음 · 알 수 없음" in texts
    # 제품 단독 '중국산' 라벨은 절대 없다
    assert all(t != "중국산" for t in texts)


def test_involves_country_never_infers_unknown():
    r = involves_country("CN", "KR", "KR", [("고춧가루", "CN", "label"), ("마늘", None, None)])
    assert r == {"manufacturing": False, "brand_owner": False, "ingredients": ["고춧가루"]}


def test_caffeine_limits():
    assert daily_limit_mg() == 400
    assert daily_limit_mg(pregnant=True) == 300
    assert daily_limit_mg(age_years=10, weight_kg=20) == 50
    assert daily_limit_mg(sensitivity="sensitive") == 200
    assert daily_limit_mg(sensitivity="avoid") == 0


def test_high_caffeine_threshold():
    assert is_high_caffeine(94, 250) is True  # 0.376 mg/mL
    assert is_high_caffeine(23, 250) is False
    assert is_high_caffeine(None, 250) is False
