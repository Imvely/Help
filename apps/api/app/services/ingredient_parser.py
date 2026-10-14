"""원재료명 원문 → 구조화 파서 (docs/04 §3).

입력 예(식약처 C002 RAWMTRL_NM 또는 라벨 OCR):
  "배추(국산), 고춧가루(중국산), 마늘, 새우젓(새우:국산), 대두(외국산(미국,브라질)),
   L-글루탐산나트륨(향미증진제)"

출력: ParsedIngredient 리스트. 각 항목은 이름 / 원산지 / 하위 원료 / 용도 힌트 / 원문을 가진다.

왜 정규식 하나로 안 되나?
  괄호가 중첩되고("외국산(미국,브라질)") 괄호 안에 쉼표가 있어, 단순 split(",") 은 깨진다.
  그래서 "괄호 깊이를 세는" 스택 방식으로 최상위 쉼표에서만 자른다.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

# 국가 표기 → ISO 코드. "외국산"/"수입산" 은 그대로 둔다(법상 허용 표기, docs/05 §7).
COUNTRY_WORDS: dict[str, str] = {
    "국산": "KR", "국내산": "KR", "한국": "KR", "한국산": "KR", "대한민국": "KR",
    "중국": "CN", "중국산": "CN",
    "미국": "US", "미국산": "US",
    "일본": "JP", "일본산": "JP",
    "베트남": "VN", "베트남산": "VN",
    "태국": "TH", "태국산": "TH",
    "호주": "AU", "호주산": "AU",
    "뉴질랜드": "NZ", "뉴질랜드산": "NZ",
    "브라질": "BR", "브라질산": "BR",
    "칠레": "CL", "칠레산": "CL",
    "인도": "IN", "인도산": "IN",
    "인도네시아": "ID", "인도네시아산": "ID",
    "말레이시아": "MY", "말레이시아산": "MY",
    "필리핀": "PH", "필리핀산": "PH",
    "러시아": "RU", "러시아산": "RU",
    "독일": "DE", "독일산": "DE",
    "프랑스": "FR", "프랑스산": "FR",
    "이탈리아": "IT", "이탈리아산": "IT",
    "스페인": "ES", "스페인산": "ES",
    "네덜란드": "NL", "네덜란드산": "NL",
    "영국": "GB", "영국산": "GB",
    "캐나다": "CA", "캐나다산": "CA",
    "터키": "TR", "튀르키예": "TR",
    "페루": "PE", "페루산": "PE",
    "아르헨티나": "AR", "멕시코": "MX", "이집트": "EG",
    "외국산": "외국산", "수입산": "외국산",
}

# 괄호 속 "용도" 로 자주 나오는 말. 성분사전 functions 보강에 쓴다.
FUNCTION_WORDS = (
    "향미증진제", "감미료", "보존료", "산화방지제", "착색료", "발색제", "유화제", "안정제",
    "증점제", "산도조절제", "팽창제", "착향료", "합성착향료", "천연착향료", "영양강화제",
    "응고제", "피막제", "표백제", "습윤제", "껌기초제", "추출용제", "효소제", "거품제거제",
    "이형제", "살균제", "밀가루개량제", "젤형성제", "고결방지제", "담체", "향료",
)

_WS = re.compile(r"\s+")


@dataclass
class ParsedIngredient:
    name: str
    raw: str
    origin: str | None = None  # ISO 코드 | 외국산 | None(표시 없음)
    origin_raw: str | None = None
    sub_ingredients: list[ParsedIngredient] = field(default_factory=list)
    function_hint: str | None = None
    percent: float | None = None


def split_top_level(text: str, seps: str = ",，") -> list[str]:
    """괄호 깊이 0 인 위치의 구분자(쉼표)에서만 자른다."""
    parts: list[str] = []
    depth = 0
    buf: list[str] = []
    for ch in text:
        if ch in "([{":
            depth += 1
        elif ch in ")]}":
            depth = max(0, depth - 1)
        if ch in seps and depth == 0:
            parts.append("".join(buf))
            buf = []
        else:
            buf.append(ch)
    parts.append("".join(buf))
    return [p.strip() for p in parts if p.strip()]


def _split_name_and_paren(token: str) -> tuple[str, str | None]:
    """'대두(외국산(미국,브라질))' → ('대두', '외국산(미국,브라질)')"""
    token = token.strip()
    m = re.match(r"^(.*?)\s*[\(（](.*)[\)）]\s*$", token)
    if not m:
        return token, None
    return m.group(1).strip(), m.group(2).strip()


def _country_from_text(text: str) -> tuple[str | None, str | None]:
    """괄호 내용에서 국가 표기를 찾는다. '새우:국산' 처럼 콜론 뒤도 본다."""
    t = text.replace("：", ":")
    if ":" in t:
        t = t.split(":", 1)[1]
    t = t.strip()
    # '외국산(미국,브라질)' 은 외국산으로 둔다 (법상 국가 변동 원료 표기, 특정 국가 추정 금지)
    head = re.split(r"[\(（]", t, maxsplit=1)[0].strip()
    if head in COUNTRY_WORDS:
        return COUNTRY_WORDS[head], text
    for word, code in COUNTRY_WORDS.items():
        if re.fullmatch(rf"{re.escape(word)}", head):
            return code, text
    return None, None


_PCT = re.compile(r"(\d+(?:\.\d+)?)\s*%")


def parse_ingredient_token(token: str) -> ParsedIngredient:
    name, paren = _split_name_and_paren(token)
    name = _WS.sub(" ", name)
    item = ParsedIngredient(name=name, raw=token.strip())
    pct = _PCT.search(item.name)
    if pct:
        item.percent = float(pct.group(1))
        item.name = _PCT.sub("", item.name).strip()
    if paren is None:
        return item

    # 괄호 내용은 다시 최상위 쉼표/슬래시로 나눠 각각 해석한다.
    for piece in split_top_level(paren, seps=",，/"):
        piece = piece.strip()
        if not piece:
            continue
        # 1) '3%' 처럼 비율만 있는 조각 → 부모의 함량
        if _PCT.fullmatch(piece):
            item.percent = float(_PCT.match(piece).group(1))
            continue
        # 2) 'ㄱ:ㄴ' 형태(새우젓(새우:국산)) → 하위 원료 + 그 원료의 원산지
        p2 = piece.replace("：", ":")
        if ":" in p2 and not p2.startswith(":"):
            sub_name, sub_rest = p2.split(":", 1)
            sub = parse_ingredient_token(sub_name.strip())
            c, r = _country_from_text(sub_rest)
            if c:
                sub.origin, sub.origin_raw = c, piece
            else:
                sub.sub_ingredients.extend(parse_ingredients(sub_rest))
            item.sub_ingredients.append(sub)
            continue
        # 3) 국가 표기만 있는 조각 → 이 원료의 원산지
        country, raw = _country_from_text(piece)
        if country:
            if item.origin is None:
                item.origin, item.origin_raw = country, raw
            continue
        # 4) 용도 표기 → function_hint
        if any(piece.startswith(w) or piece == w for w in FUNCTION_WORDS):
            item.function_hint = piece
            continue
        # 5) 그 외는 하위 원료(복합원재료): 예) 양념(고춧가루, 설탕 3%)
        item.sub_ingredients.append(parse_ingredient_token(piece))

    # 하위 원료 하나만 원산지를 갖는 경우(밀가루(밀:미국산)) 부모 배지에도 올린다.
    if item.origin is None:
        with_origin = [s for s in item.sub_ingredients if s.origin]
        if len(with_origin) == 1 and len(item.sub_ingredients) == 1:
            item.origin, item.origin_raw = with_origin[0].origin, with_origin[0].origin_raw
    return item


def parse_ingredients(text: str | None) -> list[ParsedIngredient]:
    if not text:
        return []
    text = text.replace("\n", ",").strip()
    text = re.sub(r"^원재료명\s*[:：]\s*", "", text)
    return [parse_ingredient_token(t) for t in split_top_level(text)]


def flatten_names(items: list[ParsedIngredient]) -> list[str]:
    """알레르겐/성분 매칭용: 하위 원료 이름까지 평탄화."""
    out: list[str] = []
    for it in items:
        out.append(it.name)
        out.extend(flatten_names(it.sub_ingredients))
    return out
