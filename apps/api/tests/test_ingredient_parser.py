from app.services.ingredient_parser import (
    flatten_names,
    parse_ingredient_token,
    parse_ingredients,
    split_top_level,
)


def test_split_top_level_respects_parentheses():
    assert split_top_level("a(b,c), d, e(f(g,h))") == ["a(b,c)", "d", "e(f(g,h))"]


def test_simple_origin():
    it = parse_ingredient_token("고춧가루(중국산)")
    assert it.name == "고춧가루" and it.origin == "CN" and it.origin_raw == "중국산"


def test_domestic_variants():
    assert parse_ingredient_token("배추(국산)").origin == "KR"
    assert parse_ingredient_token("배추(국내산)").origin == "KR"


def test_foreign_generic_is_not_resolved_to_country():
    """'외국산(미국,브라질)' 은 법상 국가 변동 원료 표기 → 특정 국가로 추정하지 않는다."""
    it = parse_ingredient_token("대두(외국산(미국,브라질))")
    assert it.origin == "외국산"


def test_sub_ingredient_with_origin():
    it = parse_ingredient_token("새우젓(새우:국산)")
    assert it.sub_ingredients[0].name == "새우"
    assert it.sub_ingredients[0].origin == "KR"
    assert it.origin == "KR"  # 단일 하위 원료의 원산지는 부모 배지에도 올린다


def test_function_hint():
    it = parse_ingredient_token("L-글루탐산나트륨(향미증진제)")
    assert it.function_hint == "향미증진제" and it.origin is None


def test_compound_with_percent():
    it = parse_ingredient_token("양념(고춧가루, 설탕 3%)")
    names = [s.name for s in it.sub_ingredients]
    assert names == ["고춧가루", "설탕"]
    assert it.sub_ingredients[1].percent == 3.0


def test_parent_percent():
    it = parse_ingredient_token("설탕 12%")
    assert it.name == "설탕" and it.percent == 12.0


def test_prefix_and_newlines():
    items = parse_ingredients("원재료명: 배추(국산),\n고춧가루(중국산)")
    assert [i.name for i in items] == ["배추", "고춧가루"]


def test_flatten_names_includes_sub():
    items = parse_ingredients("혼합제제(정제소금, 구연산(산도조절제))")
    assert flatten_names(items) == ["혼합제제", "정제소금", "구연산"]
    assert items[0].sub_ingredients[1].function_hint == "산도조절제"


def test_empty():
    assert parse_ingredients(None) == [] and parse_ingredients("") == []
