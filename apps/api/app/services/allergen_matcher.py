"""원재료명 텍스트에서 알레르겐 코드를 찾는다.

두 가지 신호를 합친다.
1) 성분 사전(ingredient_allergens): 성분이 이미 알레르겐에 매핑돼 있으면 그대로.
2) 동의어 사전(allergens.synonyms): '난백', '계란' → egg 처럼 원문 텍스트 매칭.
'혼입 가능' 문구는 may_contain 으로 따로 돌려준다 (포함 ≠ 혼입 가능, docs/05 §4).
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.services.ingredient_parser import ParsedIngredient, flatten_names

MAY_CONTAIN_PATTERNS = [
    r"같은\s*(?:제조\s*)?시설",
    r"혼입\s*(?:될\s*수|가능)",
    r"제조하고\s*있습니다",
    r"may\s+contain",
]


@dataclass
class AllergenHit:
    code: str
    matched_text: str


def match_allergens(
    names: list[str], synonyms_by_code: dict[str, list[str]]
) -> list[AllergenHit]:
    """names: 평탄화된 원재료 이름들. synonyms_by_code: {code: [동의어...]} (name_ko 포함)."""
    hits: dict[str, AllergenHit] = {}
    for name in names:
        n = name.replace(" ", "")
        for code, syns in synonyms_by_code.items():
            for s in syns:
                s2 = s.replace(" ", "")
                if s2 and s2 in n:
                    hits.setdefault(code, AllergenHit(code=code, matched_text=name))
    return list(hits.values())


def match_from_parsed(
    items: list[ParsedIngredient], synonyms_by_code: dict[str, list[str]]
) -> list[AllergenHit]:
    return match_allergens(flatten_names(items), synonyms_by_code)


def extract_may_contain(
    statement: str | None, synonyms_by_code: dict[str, list[str]]
) -> list[str]:
    """'이 제품은 땅콩, 우유를 사용한 제품과 같은 제조시설에서 제조' → ['peanut', 'milk']"""
    if not statement:
        return []
    if not any(re.search(p, statement) for p in MAY_CONTAIN_PATTERNS):
        return []
    hits = match_allergens([statement], synonyms_by_code)
    return sorted({h.code for h in hits})
