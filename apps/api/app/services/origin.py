"""원산지 표시 문구 생성 (docs/05 §7 규칙).

핵심 원칙:
- 레벨(제조국/브랜드/원재료)을 반드시 붙인다. 제품 전체에 "중국산" 같은 단독 라벨을 만들지 않는다.
- 표시 의무가 없는 원료는 '알 수 없음'. 절대 "중국산 아님"으로 추정하지 않는다.
- 국가별 색상 차등 없음. 국기 이모지 + 국가명만.
"""

from __future__ import annotations

from dataclasses import dataclass

COUNTRY_NAMES: dict[str, tuple[str, str]] = {
    "KR": ("한국", "🇰🇷"), "CN": ("중국", "🇨🇳"), "US": ("미국", "🇺🇸"), "JP": ("일본", "🇯🇵"),
    "VN": ("베트남", "🇻🇳"), "TH": ("태국", "🇹🇭"), "AU": ("호주", "🇦🇺"), "NZ": ("뉴질랜드", "🇳🇿"),
    "BR": ("브라질", "🇧🇷"), "CL": ("칠레", "🇨🇱"), "IN": ("인도", "🇮🇳"), "ID": ("인도네시아", "🇮🇩"),
    "MY": ("말레이시아", "🇲🇾"), "PH": ("필리핀", "🇵🇭"), "RU": ("러시아", "🇷🇺"), "DE": ("독일", "🇩🇪"),
    "FR": ("프랑스", "🇫🇷"), "IT": ("이탈리아", "🇮🇹"), "ES": ("스페인", "🇪🇸"), "NL": ("네덜란드", "🇳🇱"),
    "GB": ("영국", "🇬🇧"), "CA": ("캐나다", "🇨🇦"), "TR": ("튀르키예", "🇹🇷"), "PE": ("페루", "🇵🇪"),
    "AR": ("아르헨티나", "🇦🇷"), "MX": ("멕시코", "🇲🇽"), "EG": ("이집트", "🇪🇬"),
    "외국산": ("외국산", "🌐"), "unknown": ("알 수 없음", "❔"),
}


def country_label(code: str | None) -> str:
    if not code:
        return "❔ 알 수 없음"
    name, flag = COUNTRY_NAMES.get(code, (code, "🏳️"))
    return f"{flag} {name}"


@dataclass
class OriginBadge:
    level: str  # manufacturing | brand_owner | ingredient | note
    text: str
    country: str | None = None
    ingredient: str | None = None


def ingredient_origin_text(name: str, country: str | None, source: str | None = None) -> str:
    if country is None or country == "unknown":
        return f"{name}: 표시 의무 없음 · 알 수 없음"
    if country == "외국산":
        return f"{name}: 외국산(국가 변동 원료, 법상 허용 표기)"
    basis = "라벨 기준" if source in (None, "label", "ocr_user", "ocr_verified") else "제보 기준"
    return f"원재료 중 {name}: {country_label(country)}산({basis})"


def build_badges(
    manufacturing_country: str | None,
    brand_owner_country: str | None,
    oem_flag: bool,
    ingredient_origins: list[tuple[str, str | None, str | None]],
    undisclosed_count: int = 0,
) -> list[OriginBadge]:
    badges: list[OriginBadge] = []
    if manufacturing_country:
        badges.append(
            OriginBadge("manufacturing", f"제조국: {country_label(manufacturing_country)}",
                        manufacturing_country)
        )
    else:
        badges.append(OriginBadge("manufacturing", "제조국: ❔ 알 수 없음"))
    if brand_owner_country:
        oem = " (OEM)" if oem_flag else ""
        badges.append(
            OriginBadge("brand_owner", f"브랜드: {country_label(brand_owner_country)}{oem}",
                        brand_owner_country)
        )
    for name, country, source in ingredient_origins:
        badges.append(
            OriginBadge("ingredient", ingredient_origin_text(name, country, source), country, name)
        )
    if undisclosed_count:
        badges.append(
            OriginBadge("note", f"{undisclosed_count}개 원료는 표시 의무 없음 · 알 수 없음")
        )
    return badges


def involves_country(
    code: str,
    manufacturing_country: str | None,
    brand_owner_country: str | None,
    ingredient_origins: list[tuple[str, str | None, str | None]],
) -> dict:
    """어느 레벨이 특정 국가와 관련되는지. unknown 은 절대 해당 국가로 추정하지 않는다."""
    return {
        "manufacturing": manufacturing_country == code,
        "brand_owner": brand_owner_country == code,
        "ingredients": [name for name, c, _ in ingredient_origins if c == code],
    }


DISCLAIMER = (
    "원산지·제조국은 안전이나 품질을 뜻하지 않습니다. 표시는 식약처 신고·제품 라벨·"
    "사용자 제보를 근거로 하며, 정정 요청을 받습니다."
)
