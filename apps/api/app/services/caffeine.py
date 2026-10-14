"""카페인 기준 (docs/05 §5).

- 고카페인 표시 기준: 액체식품 0.15 mg/mL 이상
- 1일 최대 섭취 권고: 성인 400mg / 임산부 300mg / 어린이·청소년 2.5mg/kg
개인화 판정 자체는 기기(packages/domain)에서 하므로 서버는 제품 측 필드만 계산한다.
"""

HIGH_CAFFEINE_MG_PER_ML = 0.15


def is_high_caffeine(caffeine_mg: float | None, volume_ml: float | None) -> bool:
    if not caffeine_mg or not volume_ml:
        return False
    return caffeine_mg / volume_ml >= HIGH_CAFFEINE_MG_PER_ML


def daily_limit_mg(
    pregnant: bool = False, age_years: int | None = None, weight_kg: float | None = None,
    sensitivity: str = "normal",
) -> float:
    limit = 400.0
    if pregnant:
        limit = 300.0
    if age_years is not None and age_years < 19 and weight_kg:
        limit = 2.5 * weight_kg
    if sensitivity == "sensitive":
        limit *= 0.5
    elif sensitivity == "avoid":
        limit = 0.0
    return limit
