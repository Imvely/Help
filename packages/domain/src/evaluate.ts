/**
 * 개인화 경고 엔진 (docs/02-product-spec.md §4 "⚠ 내 프로필", §5 개인화 차원)
 *
 * 서버 응답(성분·등급·알레르기·영양)과 기기 로컬 프로필을 교차해
 * 결과 카드 최상단에 보여줄 경고 목록을 만듭니다. 순수 함수이며 부작용이 없습니다.
 *
 * 심각도: danger(회수·알레르기 포함) > warning > info.
 * 정렬: 심각도 순, 같은 심각도 안에서는 규칙 적용 순서(안정 정렬).
 */

import { allergenLabel, findAllergenMatches } from './allergens.js';
import { caffeineWarning, productCaffeineMg, CAFFEINE_LIMIT_PREGNANT_MG } from './caffeine.js';
import type {
  GradeSummary,
  HealthProfile,
  Ingredient,
  PersonalWarning,
  PersonalWarnings,
  Product,
  WarningSeverity,
} from './types.js';

export interface EvaluateContext {
  /** 오늘 섭취한(스캔 후 "마셨어요" 체크) 카페인 누적 mg (P1-7) */
  todayCaffeineMg?: number;
}

// ---------------------------------------------------------------------------
// 임계값 (docs/05 §6 한국 1일 영양성분 기준치: 나트륨 2,000mg, 당류 100g)
// ---------------------------------------------------------------------------

/** 한국 1일 나트륨 기준치(mg) */
export const SODIUM_DAILY_MG = 2000;
/** 고혈압: 1회 제공량 나트륨이 기준치의 30%(600mg) 이상이면 warning */
export const SODIUM_WARN_MG = 600;
/** 고혈압: 400mg 이상이면 info */
export const SODIUM_INFO_MG = 400;
/** 당뇨: 1회 제공량 당류 10g 이상이면 warning */
export const SUGAR_WARN_G = 10;

// ---------------------------------------------------------------------------
// 성분명 패턴
// ---------------------------------------------------------------------------

/** 주정·알코올(식품). 임신·수유 시 info */
export const ALCOHOL_PATTERN = /주정|알코올|알콜|에탄올|alcohol|ethanol/i;
/** 임신 중 피부과 "전문가 권고" 화장품 성분: 레티노이드·살리실산·하이드로퀴논 */
export const PREGNANCY_COSMETIC_PATTERN = /레티놀|레티닐|레티노|살리실산|하이드로퀴논|retinol|retinyl|retinoi|salicylic|hydroquinone/i;
/** 감미료 용도 */
export const SWEETENER_FUNCTION_PATTERN = /감미료/;
/** 인산염 첨가물(신장질환). 한국 라벨엔 인 함량이 없어 첨가물명으로만 탐지 */
export const PHOSPHATE_PATTERN = /인산/;
/** 비건: 동물성 원재료 */
export const ANIMAL_PATTERN = /돼지|쇠고기|닭|우유|알류|난|젤라틴|꿀/;
/** 타르색소(어린이): 황색4호, 적색 제40호, 청색1호 … */
export const TAR_DYE_PATTERN = /(황색|적색|청색|녹색)\s*(제)?\s*\d+\s*호/;

// ---------------------------------------------------------------------------
// 등급 요약
// ---------------------------------------------------------------------------

/** 성분 등급 개수 요약 {0,1,2,3,unknown} (docs/02 §4 "안전 12 · 주의 1 …") */
export function gradeSummary(ingredients: readonly Ingredient[]): GradeSummary {
  const s: GradeSummary = { '0': 0, '1': 0, '2': 0, '3': 0, unknown: 0 };
  for (const ing of ingredients) {
    switch (ing.grade) {
      case 0: s['0'] += 1; break;
      case 1: s['1'] += 1; break;
      case 2: s['2'] += 1; break;
      case 3: s['3'] += 1; break;
      default: s.unknown += 1;
    }
  }
  return s;
}

// ---------------------------------------------------------------------------
// 보조
// ---------------------------------------------------------------------------

const SEVERITY_RANK: Record<WarningSeverity, number> = { danger: 0, warning: 1, info: 2 };

function names(ings: readonly Ingredient[]): string[] {
  return ings.map((i) => i.name);
}

function joinNames(list: readonly string[]): string {
  return list.join(', ');
}

function textOf(ing: Ingredient): string {
  return `${ing.name} ${ing.function ?? ''} ${ing.raw_text ?? ''}`;
}

function isChildProfile(profile: HealthProfile): boolean {
  return profile.childAgeYears !== undefined && profile.childAgeYears !== null;
}

// ---------------------------------------------------------------------------
// 메인
// ---------------------------------------------------------------------------

/**
 * 제품 × 프로필 → 개인화 경고 목록.
 * 프로필이 비어 있어도 회수·등급 3/2·고카페인 경고는 모두에게 나갑니다.
 */
export function evaluateProduct(
  product: Product,
  profile: HealthProfile,
  ctx: EvaluateContext = {},
): PersonalWarnings {
  const out: PersonalWarning[] = [];
  const push = (w: PersonalWarning) => out.push(w);
  const ingredients = product.ingredients ?? [];
  const nutrition = product.nutrition;
  const isCosmetic = product.product.category === 'cosmetic';
  const pregnancyOrNursing = profile.pregnant || profile.nursing;

  // 1) 회수·판매중지 — 항상 최우선 danger (docs/02 §2 M7)
  if (product.recall) {
    const grade = product.recall.grade ? ` (${product.recall.grade})` : '';
    push({
      severity: 'danger',
      kind: 'recall',
      message: `회수·판매중지 제품입니다${grade}: ${product.recall.reason}`,
      note: product.recall.issued_at ? `식약처 발표 ${product.recall.issued_at}` : undefined,
    });
  }

  // 2) 알레르기 — 포함은 danger, 혼입 가능은 severeAllergy 면 warning / 아니면 info (docs/05 §4)
  if (profile.allergens.length > 0) {
    for (const m of findAllergenMatches(profile.allergens, product.allergens?.contains ?? [])) {
      const productLabel = allergenLabel(m.productCode);
      const profileLabel = allergenLabel(m.profileCode);
      const via = m.profileCode === m.productCode ? '' : ` — 내 알레르기 "${profileLabel}"에 해당`;
      push({
        severity: 'danger',
        kind: 'allergen_contains',
        message: `${productLabel} 포함${via}`,
        allergen: m.productCode,
        profileAllergen: m.profileCode,
      });
    }
    for (const m of findAllergenMatches(profile.allergens, product.allergens?.may_contain ?? [])) {
      const productLabel = allergenLabel(m.productCode);
      push({
        severity: profile.severeAllergy ? 'warning' : 'info',
        kind: 'allergen_may_contain',
        message: `${productLabel} 혼입 가능 — 같은 제조시설에서 제조된 제품입니다`,
        allergen: m.productCode,
        profileAllergen: m.profileCode,
        note: profile.severeAllergy ? '"심한 알레르기" 설정으로 혼입 가능도 경고합니다' : undefined,
      });
    }
  }

  // 3) 카페인 (docs/05 §5)
  const caffeine = caffeineWarning(product, profile, ctx.todayCaffeineMg ?? 0);
  if (caffeine) {
    push({
      severity: caffeine.severity,
      kind: 'caffeine',
      message: caffeine.message,
      note: caffeine.estimated ? '카페인 함량은 카테고리 평균 추정값입니다' : undefined,
    });
  } else if (nutrition?.high_caffeine) {
    // 한도 내라도 "고카페인 함유" 표시 의무 제품은 알려준다
    const mg = productCaffeineMg(product);
    push({
      severity: 'info',
      kind: 'caffeine_high',
      message: mg !== null ? `고카페인 함유 제품(카페인 ${mg}mg)` : '고카페인 함유 제품',
    });
  }

  // 4) 임신·수유 (docs/02 §5)
  if (profile.pregnant) {
    const mg = productCaffeineMg(product);
    if (mg !== null && mg > 0) {
      push({
        severity: 'info',
        kind: 'pregnancy_caffeine_limit',
        message: `임신 중 카페인 1일 권고 한도는 ${CAFFEINE_LIMIT_PREGNANT_MG}mg입니다 (이 제품 ${mg}mg)`,
      });
    }
  }
  if (pregnancyOrNursing) {
    if (isCosmetic) {
      const hits = ingredients.filter((i) => PREGNANCY_COSMETIC_PATTERN.test(textOf(i)));
      if (hits.length > 0) {
        push({
          severity: 'warning',
          kind: 'pregnancy_cosmetic',
          message: `전문가 권고: 임신·수유 중 주의 성분 — ${joinNames(names(hits))}`,
          ingredients: names(hits),
          note: '레티노이드·고농도 살리실산·하이드로퀴논은 피부과 전문가 권고 기준이며 법적 금지 성분은 아닙니다',
        });
      }
    } else {
      const hits = ingredients.filter((i) => ALCOHOL_PATTERN.test(textOf(i)));
      if (hits.length > 0) {
        push({
          severity: 'info',
          kind: 'pregnancy_alcohol',
          message: `주정·알코올 성분 포함 — ${joinNames(names(hits))}`,
          ingredients: names(hits),
          note: '식품 가공용 주정은 소량이지만 임신·수유 중에는 참고하세요',
        });
      }
    }
  }

  // 5) 당뇨 — 당류 ≥ 10g/1회 제공량 warning, 감미료 목록 info (docs/02 §5)
  if (profile.diabetes) {
    const sugar = nutrition?.sugar_g;
    if (sugar !== undefined && sugar !== null && sugar >= SUGAR_WARN_G) {
      push({
        severity: 'warning',
        kind: 'diabetes_sugar',
        message: `당류 ${sugar}g/1회 제공량 — 당뇨 프로필 기준 높음`,
      });
    }
    const sweeteners = ingredients.filter((i) => SWEETENER_FUNCTION_PATTERN.test(i.function ?? ''));
    if (sweeteners.length > 0) {
      push({
        severity: 'info',
        kind: 'diabetes_sweetener',
        message: `감미료 사용: ${joinNames(names(sweeteners))}`,
        ingredients: names(sweeteners),
        // WHO 2023 NSS 가이드라인: "대체당이라 건강해요" 식 문구 금지 → 사실만
        note: '설탕 대신 사용된 감미료입니다. 종류별 설명은 성분 상세에서 확인하세요',
      });
    }
  }

  // 6) 고혈압 — 나트륨 ≥ 600mg(1일 기준치 30%) warning, ≥ 400mg info
  if (profile.hypertension) {
    const sodium = nutrition?.sodium_mg;
    if (sodium !== undefined && sodium !== null) {
      const pct = Math.round((sodium / SODIUM_DAILY_MG) * 100);
      if (sodium >= SODIUM_WARN_MG) {
        push({
          severity: 'warning',
          kind: 'hypertension_sodium',
          message: `나트륨 ${sodium}mg/1회 제공량 — 1일 기준치(${SODIUM_DAILY_MG}mg)의 ${pct}%`,
        });
      } else if (sodium >= SODIUM_INFO_MG) {
        push({
          severity: 'info',
          kind: 'hypertension_sodium',
          message: `나트륨 ${sodium}mg/1회 제공량 — 1일 기준치의 ${pct}%`,
        });
      }
    }
  }

  // 7) 신장질환 — 인산염 첨가물명 탐지 (docs/05 §3: 한국 라벨에 인 함량 없음)
  if (profile.kidney) {
    const hits = ingredients.filter((i) => PHOSPHATE_PATTERN.test(i.name));
    if (hits.length > 0) {
      push({
        severity: 'warning',
        kind: 'kidney_phosphate',
        message: `인산염 첨가물 포함 — ${joinNames(names(hits))}`,
        ingredients: names(hits),
        note: '한국 식품 라벨에는 인(P) 함량이 표시되지 않아 첨가물명으로만 탐지합니다. 실제 함량은 알 수 없습니다',
      });
    }
  }

  // 8) 비건 — 동물성 원재료명
  if (profile.vegan) {
    const hits = ingredients.filter((i) => ANIMAL_PATTERN.test(i.name));
    if (hits.length > 0) {
      push({
        severity: 'warning',
        kind: 'vegan',
        message: `동물성 원재료 포함 — ${joinNames(names(hits))}`,
        ingredients: names(hits),
        note: '원재료명 기준 탐지이며 인증 정보는 별도입니다',
      });
    }
  }

  // 9) 어린이 — 등급 1 중 child 그룹, 또는 타르색소명 (docs/05 §3 타르색소)
  if (isChildProfile(profile)) {
    const hits = ingredients.filter(
      (i) =>
        (i.grade === 1 && (i.applies_to_groups ?? []).includes('child')) ||
        TAR_DYE_PATTERN.test(i.name),
    );
    if (hits.length > 0) {
      push({
        severity: 'warning',
        kind: 'child_dye',
        message: `어린이 주의 성분 — ${joinNames(names(hits))}`,
        ingredients: names(hits),
        note: 'EU는 타르색소에 어린이 행동·주의력 경고문을 의무화합니다. 한국 어린이 기호식품 품질인증 시 제한',
      });
    }
  }

  // 10) 등급 3 → 모두에게 warning, 등급 2 → info (docs/05 §2)
  const grade3 = ingredients.filter((i) => i.grade === 3);
  if (grade3.length > 0) {
    push({
      severity: 'warning',
      kind: 'grade_3',
      message: `유해(회피 권장) 성분 ${grade3.length}개 — ${joinNames(names(grade3))}`,
      ingredients: names(grade3),
    });
  }
  const grade2 = ingredients.filter((i) => i.grade === 2);
  if (grade2.length > 0) {
    push({
      severity: 'info',
      kind: 'grade_2',
      message: `논쟁적 성분 ${grade2.length}개 — ${joinNames(names(grade2))}`,
      ingredients: names(grade2),
      note: '규제기관은 안전 결론이나 연구 신호·기관 간 불일치가 있습니다. 근거는 성분 상세에서 확인하세요',
    });
  }

  // 심각도 순 안정 정렬(Array.prototype.sort 는 ES2019+ 에서 안정)
  const warnings = out
    .map((w, i) => ({ w, i }))
    .sort((a, b) => SEVERITY_RANK[a.w.severity] - SEVERITY_RANK[b.w.severity] || a.i - b.i)
    .map((x) => x.w);

  const counts: Record<WarningSeverity, number> = { danger: 0, warning: 0, info: 0 };
  for (const w of warnings) counts[w.severity] += 1;

  return {
    warnings,
    counts,
    highest: warnings.length > 0 ? warnings[0]!.severity : null,
  };
}
