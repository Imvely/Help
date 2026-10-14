/**
 * 판정 로직 어댑터 (docs/03-architecture.md §5 `domain/`).
 *
 * 실제 판정 엔진은 모노레포의 `packages/domain`(@eodisan/domain) 에서 순수 TypeScript 로 만들어집니다.
 * 앱 코드는 이 파일만 import 하므로, 패키지가 발행되면 **이 파일 하나만** 바꾸면 됩니다.
 *
 * TODO(@eodisan/domain 발행 후): 아래 로컬 구현을 지우고 다음 한 줄로 교체
 *   export { evaluateProduct, gradeSummary, originBadges, caffeineLimitMg } from '@eodisan/domain';
 *   (타입은 src/data/types.ts 가 이미 동일한 형태입니다.)
 *
 * 지금은 패키지의 dist/ 가 없어도 타입체크가 통과하도록, 알레르기·회수·카페인·당뇨·고혈압에 대한
 * 간단한 폴백 구현을 둡니다. 규칙의 "정답"은 패키지 쪽이며 여기는 UI 를 돌리기 위한 최소치입니다.
 */
import type {
  CountryCode,
  GradeSummary,
  HealthProfile,
  Ingredient,
  Origin,
  PersonalWarning,
  PersonalWarnings,
  Product,
  WarningSeverity,
} from '@/data/types';

// ---------------------------------------------------------------------------
// 국가 표시 (국기 이모지 + 한글명). 색상은 절대 국가별로 다르게 쓰지 않습니다(docs/02 §4).
// ---------------------------------------------------------------------------

const COUNTRY_NAMES_KO: Record<string, string> = {
  KR: '한국', CN: '중국', US: '미국', JP: '일본', VN: '베트남', TH: '태국', DE: '독일', FR: '프랑스',
  IT: '이탈리아', AU: '호주', NZ: '뉴질랜드', BR: '브라질', CL: '칠레', IN: '인도', ID: '인도네시아',
  MY: '말레이시아', PH: '필리핀', RU: '러시아', GB: '영국', CA: '캐나다', ES: '스페인', NL: '네덜란드',
  TR: '튀르키예', EG: '이집트', PE: '페루', AR: '아르헨티나', MX: '멕시코',
};

/** ISO alpha-2 → 국기 이모지 (regional indicator 문자 조합) */
export function flagEmoji(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return '';
  const base = 0x1f1e6; // 🇦
  return String.fromCodePoint(base + code.charCodeAt(0) - 65, base + code.charCodeAt(1) - 65);
}

export function countryLabel(code: CountryCode | null | undefined): string {
  if (!code || code === 'unknown') return '알 수 없음';
  if (code === '외국산') return '외국산';
  return COUNTRY_NAMES_KO[code] ?? code;
}

export interface OriginBadge {
  /** 반드시 레벨을 붙입니다: 제조국 / 브랜드 / 원재료 */
  level: 'manufacturing' | 'brand' | 'ingredient';
  label: string;
  country: CountryCode | null;
  flag: string;
  countryName: string;
  /** 원재료 배지일 때 라벨 순위 */
  rank?: number | null;
  /** 원재료명(원재료 배지일 때) */
  ingredientName?: string;
  /** "국산" 처럼 라벨 표기를 그대로 쓰고 싶을 때 */
  text: string;
}

/**
 * 원산지 3단 배지 (제조국 · 원재료 상위 3순위 · 브랜드 국가).
 * 표시 의무가 없는 원료는 "알 수 없음" 으로 두고 절대 추정하지 않습니다.
 */
export function originBadges(origin: Origin | null | undefined): OriginBadge[] {
  if (!origin) return [];
  const badges: OriginBadge[] = [];

  const make = (
    level: OriginBadge['level'],
    label: string,
    country: CountryCode | null,
    extra: Partial<OriginBadge> = {},
  ): OriginBadge => {
    const flag = country && country !== 'unknown' && country !== '외국산' ? flagEmoji(country) : '';
    const countryName = countryLabel(country);
    const isDomestic = country === 'KR' && level === 'ingredient';
    return {
      level,
      label,
      country,
      flag,
      countryName,
      text: isDomestic ? '국산' : `${flag ? `${flag} ` : ''}${countryName}`,
      ...extra,
    };
  };

  const mfg = make('manufacturing', '제조국', origin.manufacturing_country);
  if (origin.oem && origin.brand_owner_country && origin.manufacturing_country) {
    mfg.text = `${mfg.text} (OEM)`;
  }
  badges.push(mfg);
  badges.push(make('brand', '브랜드', origin.brand_owner_country));

  const ranked = [...origin.ingredients].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)).slice(0, 3);
  for (const ing of ranked) {
    badges.push(
      make('ingredient', ing.name, ing.country, { rank: ing.rank ?? null, ingredientName: ing.name }),
    );
  }
  return badges;
}

// ---------------------------------------------------------------------------
// 성분 등급 요약
// ---------------------------------------------------------------------------

export function gradeSummary(ingredients: Ingredient[]): GradeSummary {
  const s: GradeSummary = { '0': 0, '1': 0, '2': 0, '3': 0, unknown: 0 };
  for (const ing of ingredients) {
    if (ing.grade === null || ing.grade === undefined) s.unknown += 1;
    else s[String(ing.grade) as '0' | '1' | '2' | '3'] += 1;
  }
  return s;
}

// ---------------------------------------------------------------------------
// 알레르겐 코드 → 한글
// ---------------------------------------------------------------------------

/** 한국 식약처 의무 표시 19항목 + 자주 쓰는 상위 코드 */
export const ALLERGEN_LABELS_KO: Record<string, string> = {
  egg: '알류(난류)',
  milk: '우유',
  buckwheat: '메밀',
  peanut: '땅콩',
  soy: '대두',
  wheat: '밀',
  mackerel: '고등어',
  crab: '게',
  shrimp: '새우',
  pork: '돼지고기',
  peach: '복숭아',
  tomato: '토마토',
  sulfite: '아황산류',
  walnut: '호두',
  chicken: '닭고기',
  beef: '쇠고기',
  squid: '오징어',
  shellfish: '조개류',
  mollusc: '조개류(굴·전복·홍합)',
  crustacean: '갑각류',
  pine_nut: '잣',
  tree_nut: '견과류',
  sesame: '참깨',
  fish: '생선',
};

/** `shellfish.crustacean.shrimp` → "새우". 모르는 코드는 마지막 조각을 그대로. */
export function allergenLabel(code: string): string {
  const parts = code.split('.');
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const hit = ALLERGEN_LABELS_KO[parts[i]];
    if (hit) return hit;
  }
  return parts[parts.length - 1] ?? code;
}

/** 프로필 코드(상위일 수 있음)가 제품 코드와 일치하는지: 완전 일치 또는 계층 접두/접미 일치 */
function allergenMatches(profileCode: string, productCode: string): boolean {
  if (profileCode === productCode) return true;
  if (productCode.startsWith(`${profileCode}.`)) return true; // shellfish → shellfish.crustacean.shrimp
  const productParts = productCode.split('.');
  return productParts.includes(profileCode); // shrimp → shellfish.crustacean.shrimp
}

// ---------------------------------------------------------------------------
// 카페인 한도
// ---------------------------------------------------------------------------

/**
 * 1일 카페인 한도(mg). docs/02 §5: 보통 400 / 민감 300 / 임신·수유 200 / 피함 0,
 * 어린이(childAgeYears) 또는 체중이 주어지면 체중×2.5mg 상한을 추가로 적용.
 */
export function caffeineLimitMg(profile: HealthProfile): number {
  if (profile.caffeineSensitivity === 'avoid') return 0;
  let limit = profile.caffeineSensitivity === 'sensitive' ? 300 : 400;
  if (profile.pregnant || profile.nursing) limit = Math.min(limit, 200);
  if (profile.childAgeYears !== undefined || profile.weightKg !== undefined) {
    const weight = profile.weightKg ?? 30;
    limit = Math.min(limit, Math.round(weight * 2.5));
  }
  return limit;
}

// ---------------------------------------------------------------------------
// 개인화 경고 (알레르기 · 회수 · 카페인 · 당뇨 · 고혈압 · 임신)
// ---------------------------------------------------------------------------

export interface EvaluateContext {
  /** 오늘 이미 섭취한 카페인(mg). 누적 기능(P1-7) 전까지는 0 */
  caffeineTodayMg?: number;
}

const SEVERITY_ORDER: Record<WarningSeverity, number> = { danger: 0, warning: 1, info: 2 };

const SWEETENER_KEYWORDS = ['아스파탐', '수크랄로스', '아세설팜', '사카린', '스테비아', '에리스리톨', '알룰로스', '말티톨', '소르비톨', '자일리톨'];
const PHOSPHATE_KEYWORDS = ['인산', '피로인산', '폴리인산', '메타인산'];

/**
 * 제품 + 프로필 → "⚠ 내 프로필" 경고 목록.
 * 서버에는 프로필을 보내지 않고 기기에서만 계산합니다.
 */
export function evaluateProduct(
  product: Product,
  profile: HealthProfile,
  ctx: EvaluateContext = {},
): PersonalWarnings {
  const warnings: PersonalWarning[] = [];

  // 1) 회수·판매중지 — 프로필과 무관하게 항상 최상단
  if (product.recall) {
    warnings.push({
      severity: 'danger',
      kind: 'recall',
      message: `회수·판매중지: ${product.recall.reason}`,
      note: product.recall.grade ? `식약처 ${product.recall.grade}` : undefined,
    });
  }

  // 2) 알레르기 — 포함(danger) / 혼입 가능(심한 알레르기면 warning, 아니면 info)
  for (const mine of profile.allergens) {
    for (const code of product.allergens?.contains ?? []) {
      if (allergenMatches(mine, code)) {
        warnings.push({
          severity: 'danger',
          kind: 'allergen_contains',
          message: `${allergenLabel(code)} 포함`,
          allergen: code,
          profileAllergen: mine,
        });
      }
    }
    for (const code of product.allergens?.may_contain ?? []) {
      if (allergenMatches(mine, code)) {
        warnings.push({
          severity: profile.severeAllergy ? 'warning' : 'info',
          kind: 'allergen_may_contain',
          message: `${allergenLabel(code)} 혼입 가능`,
          allergen: code,
          profileAllergen: mine,
          note: '같은 제조시설에서 제조',
        });
      }
    }
  }

  // 3) 카페인
  const caffeine = product.nutrition?.caffeine_mg ?? null;
  if (caffeine !== null && caffeine > 0) {
    const limit = caffeineLimitMg(profile);
    const today = ctx.caffeineTodayMg ?? 0;
    const estimated = product.nutrition?.caffeine_estimated ? ' (추정치)' : '';
    if (profile.caffeineSensitivity === 'avoid') {
      warnings.push({
        severity: 'danger',
        kind: 'caffeine',
        message: `카페인 ${caffeine}mg${estimated} — 카페인 회피 설정`,
      });
    } else if (today + caffeine > limit) {
      warnings.push({
        severity: 'warning',
        kind: profile.pregnant || profile.nursing ? 'pregnancy_caffeine_limit' : 'caffeine',
        message: `카페인 ${caffeine}mg${estimated} — 1일 한도 ${limit}mg 초과`,
      });
    } else if (product.nutrition?.high_caffeine) {
      warnings.push({
        severity: 'info',
        kind: 'caffeine_high',
        message: `고카페인 음료 (${caffeine}mg${estimated})`,
      });
    }
  }

  // 4) 당뇨 — 당류, 대체 감미료 안내
  if (profile.diabetes) {
    const sugar = product.nutrition?.sugar_g ?? null;
    if (sugar !== null && sugar >= 10) {
      warnings.push({ severity: 'warning', kind: 'diabetes_sugar', message: `당류 ${sugar}g (1회 제공량)` });
    }
    const sweeteners = product.ingredients
      .filter((i) => SWEETENER_KEYWORDS.some((k) => i.name.includes(k)))
      .map((i) => i.name);
    if (sweeteners.length > 0) {
      warnings.push({
        severity: 'info',
        kind: 'diabetes_sweetener',
        message: `대체 감미료 함유: ${sweeteners.join(', ')}`,
        ingredients: sweeteners,
      });
    }
  }

  // 5) 고혈압 — 나트륨 (1일 기준치 2,000mg 의 30% 이상이면 경고)
  if (profile.hypertension) {
    const sodium = product.nutrition?.sodium_mg ?? null;
    if (sodium !== null && sodium >= 600) {
      warnings.push({
        severity: 'warning',
        kind: 'hypertension_sodium',
        message: `나트륨 높음 ${sodium}mg (1일 기준치의 ${Math.round((sodium / 2000) * 100)}%)`,
      });
    }
  }

  // 6) 신장질환 — 인산염 첨가물명만 안내(함량 데이터 없음 명시)
  if (profile.kidney) {
    const phosphates = product.ingredients
      .filter((i) => PHOSPHATE_KEYWORDS.some((k) => i.name.includes(k)))
      .map((i) => i.name);
    if (phosphates.length > 0) {
      warnings.push({
        severity: 'info',
        kind: 'kidney_phosphate',
        message: `인산염 첨가물: ${phosphates.join(', ')}`,
        ingredients: phosphates,
        note: '함량 데이터 없음',
      });
    }
  }

  // 7) 등급 3(유해) 성분은 프로필과 무관하게 안내
  const harmful = product.ingredients.filter((i) => i.grade === 3).map((i) => i.name);
  if (harmful.length > 0) {
    warnings.push({
      severity: 'warning',
      kind: 'grade_3',
      message: `유해 등급 성분: ${harmful.join(', ')}`,
      ingredients: harmful,
    });
  }

  warnings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  const counts: Record<WarningSeverity, number> = { danger: 0, warning: 0, info: 0 };
  for (const w of warnings) counts[w.severity] += 1;

  return { warnings, counts, highest: warnings[0]?.severity ?? null };
}
