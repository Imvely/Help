/**
 * 카페인 개인화 계산 (docs/05-knowledge-base.md §5)
 *
 *   limit_mg = 400                       # 기본 성인
 *   if pregnant: limit_mg = 300
 *   if age < 19 and weight_kg: limit_mg = 2.5 * weight_kg
 *   if sensitivity == "sensitive": limit_mg *= 0.5
 *   if sensitivity == "avoid": limit_mg = 0
 *   warn if product > 0.5*limit or today_total + product > limit
 */

import type { HealthProfile, Product, WarningSeverity } from './types.js';

/** 성인 1일 최대 섭취 권고(mg) */
export const CAFFEINE_LIMIT_ADULT_MG = 400;
/** 임산부 1일 최대 섭취 권고(mg) */
export const CAFFEINE_LIMIT_PREGNANT_MG = 300;
/** 어린이·청소년 체중 kg당 권고(mg/kg) */
export const CAFFEINE_LIMIT_CHILD_MG_PER_KG = 2.5;
/** 어린이·청소년 기준 나이(미만) */
export const CAFFEINE_CHILD_AGE_LIMIT = 19;

/** 프로필에 맞는 1일 카페인 한도(mg). docs/05 §5 공식을 순서대로 적용합니다. */
export function caffeineLimitMg(profile: HealthProfile): number {
  let limit = CAFFEINE_LIMIT_ADULT_MG;

  if (profile.pregnant) limit = CAFFEINE_LIMIT_PREGNANT_MG;

  // 어린이·청소년: 나이가 설정돼 있고 19세 미만이며 체중을 알 때만 2.5mg/kg
  if (
    profile.childAgeYears !== undefined &&
    profile.childAgeYears < CAFFEINE_CHILD_AGE_LIMIT &&
    profile.weightKg !== undefined &&
    profile.weightKg > 0
  ) {
    limit = CAFFEINE_LIMIT_CHILD_MG_PER_KG * profile.weightKg;
  }

  if (profile.caffeineSensitivity === 'sensitive') limit *= 0.5;
  if (profile.caffeineSensitivity === 'avoid') limit = 0;

  return limit;
}

export type CaffeineWarningReason =
  /** 카페인을 피하는 설정인데 제품에 카페인이 있음 */
  | 'avoid'
  /** 오늘 누적 + 이 제품이 한도를 넘음 */
  | 'daily_total'
  /** 이 제품 하나가 한도의 50%를 넘음 */
  | 'single_serving';

export interface CaffeineWarning {
  severity: WarningSeverity;
  reason: CaffeineWarningReason;
  caffeineMg: number;
  limitMg: number;
  todayTotalMg: number;
  /** 오늘 누적 + 이 제품 */
  projectedTotalMg: number;
  /** 라벨이 아닌 카테고리 평균 추정값인지 */
  estimated: boolean;
  message: string;
}

/** 제품의 카페인(mg). 값이 없거나 음수면 null */
export function productCaffeineMg(product: Pick<Product, 'nutrition'>): number | null {
  const v = product.nutrition?.caffeine_mg;
  if (v === undefined || v === null || Number.isNaN(v) || v < 0) return null;
  return v;
}

function fmtMg(mg: number): string {
  // 소수점이 있으면 1자리까지, 정수면 그대로
  return Number.isInteger(mg) ? `${mg}mg` : `${Math.round(mg * 10) / 10}mg`;
}

/**
 * 카페인 경고. 조건에 해당하지 않으면 null.
 * - 한도가 0(피함)이고 제품에 카페인이 있으면 'avoid'
 * - 오늘 누적 + 제품 > 한도 → 'daily_total'
 * - 제품 > 한도의 50% → 'single_serving'
 */
export function caffeineWarning(
  product: Pick<Product, 'nutrition'>,
  profile: HealthProfile,
  todayTotalMg = 0,
): CaffeineWarning | null {
  const caffeineMg = productCaffeineMg(product);
  if (caffeineMg === null || caffeineMg === 0) return null;

  const limitMg = caffeineLimitMg(profile);
  const today = Math.max(0, todayTotalMg || 0);
  const projectedTotalMg = today + caffeineMg;
  const estimated = product.nutrition?.caffeine_estimated === true;
  const est = estimated ? '(추정)' : '';

  const base = {
    caffeineMg,
    limitMg,
    todayTotalMg: today,
    projectedTotalMg,
    estimated,
  };

  if (limitMg <= 0) {
    return {
      ...base,
      severity: 'warning',
      reason: 'avoid',
      message: `카페인 ${fmtMg(caffeineMg)}${est} 함유 — 카페인을 피하도록 설정되어 있습니다`,
    };
  }

  if (projectedTotalMg > limitMg) {
    const over = today > 0 ? `오늘 누적 ${fmtMg(today)} + 이 제품 ${fmtMg(caffeineMg)}${est} = ${fmtMg(projectedTotalMg)}` : `이 제품 ${fmtMg(caffeineMg)}${est}`;
    return {
      ...base,
      severity: 'warning',
      reason: 'daily_total',
      message: `${over} → 1일 권고 한도 ${fmtMg(limitMg)}를 넘습니다`,
    };
  }

  if (caffeineMg > 0.5 * limitMg) {
    const pct = Math.round((caffeineMg / limitMg) * 100);
    return {
      ...base,
      severity: 'warning',
      reason: 'single_serving',
      message: `카페인 ${fmtMg(caffeineMg)}${est} — 1일 권고 한도 ${fmtMg(limitMg)}의 ${pct}%`,
    };
  }

  return null;
}
