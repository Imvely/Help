/**
 * 원산지 배지 생성 (docs/05-knowledge-base.md §7, docs/02-product-spec.md §4, ADR-0005)
 *
 * 법적 방어의 핵심 규칙:
 *  1. 반드시 레벨을 붙인다: "제조국: 중국", "원재료 중 고춧가루: 중국산", "브랜드: 한국(OEM 제조국: 중국)".
 *     제품 전체를 "중국산"이라고 부르는 문구는 절대 만들지 않는다.
 *  2. 표시 의무가 없는 원료(4순위 이하·첨가물·향료)는 "표시 의무 없음 · 알 수 없음".
 *     "중국산 아님"으로 추정하지 않는다.
 *  3. 라벨 "외국산"은 "외국산(국가 변동 원료, 법상 허용 표기)". 특정 국가로 추정하지 않는다.
 *  4. 국가별로 색을 다르게 쓰지 않는다. 국기 이모지 + 국가명만. (이 모듈은 색 정보를 내지 않는다.)
 *  5. "원산지·제조국은 안전이나 품질을 뜻하지 않습니다" 고정 문구.
 */

import type { CountryCode, IngredientOrigin, Origin, ProductCategory, SourceType } from './types.js';

// ---------------------------------------------------------------------------
// 국가 코드 → 한글 이름 + 국기
// ---------------------------------------------------------------------------

export interface CountryInfo {
  /** 한글 국가명 */
  name: string;
  /** 국기 이모지. 외국산·unknown 은 국기가 없다(특정 국가 추정 금지). */
  flag: string;
  /** 원재료 원산지 표기("국산", "중국산", "외국산") */
  originWord: string;
}

export const COUNTRIES: Readonly<Record<CountryCode, CountryInfo>> = Object.freeze({
  KR: { name: '한국', flag: '🇰🇷', originWord: '국산' },
  CN: { name: '중국', flag: '🇨🇳', originWord: '중국산' },
  US: { name: '미국', flag: '🇺🇸', originWord: '미국산' },
  JP: { name: '일본', flag: '🇯🇵', originWord: '일본산' },
  VN: { name: '베트남', flag: '🇻🇳', originWord: '베트남산' },
  TH: { name: '태국', flag: '🇹🇭', originWord: '태국산' },
  DE: { name: '독일', flag: '🇩🇪', originWord: '독일산' },
  FR: { name: '프랑스', flag: '🇫🇷', originWord: '프랑스산' },
  IT: { name: '이탈리아', flag: '🇮🇹', originWord: '이탈리아산' },
  AU: { name: '호주', flag: '🇦🇺', originWord: '호주산' },
  NZ: { name: '뉴질랜드', flag: '🇳🇿', originWord: '뉴질랜드산' },
  BR: { name: '브라질', flag: '🇧🇷', originWord: '브라질산' },
  CL: { name: '칠레', flag: '🇨🇱', originWord: '칠레산' },
  IN: { name: '인도', flag: '🇮🇳', originWord: '인도산' },
  ID: { name: '인도네시아', flag: '🇮🇩', originWord: '인도네시아산' },
  MY: { name: '말레이시아', flag: '🇲🇾', originWord: '말레이시아산' },
  PH: { name: '필리핀', flag: '🇵🇭', originWord: '필리핀산' },
  RU: { name: '러시아', flag: '🇷🇺', originWord: '러시아산' },
  GB: { name: '영국', flag: '🇬🇧', originWord: '영국산' },
  CA: { name: '캐나다', flag: '🇨🇦', originWord: '캐나다산' },
  ES: { name: '스페인', flag: '🇪🇸', originWord: '스페인산' },
  NL: { name: '네덜란드', flag: '🇳🇱', originWord: '네덜란드산' },
  TR: { name: '튀르키예', flag: '🇹🇷', originWord: '튀르키예산' },
  EG: { name: '이집트', flag: '🇪🇬', originWord: '이집트산' },
  PE: { name: '페루', flag: '🇵🇪', originWord: '페루산' },
  AR: { name: '아르헨티나', flag: '🇦🇷', originWord: '아르헨티나산' },
  MX: { name: '멕시코', flag: '🇲🇽', originWord: '멕시코산' },
  // 라벨 "외국산": 국가 변동 원료, 법상 허용 표기. 국기 없음.
  외국산: { name: '외국산', flag: '', originWord: '외국산' },
  // 표시 의무 없음 / 모름. 국기 없음.
  unknown: { name: '알 수 없음', flag: '', originWord: '알 수 없음' },
});

/** 고정 안내 문구 (docs/05 §7) */
export const ORIGIN_DISCLAIMER =
  '원산지·제조국은 안전이나 품질을 뜻하지 않습니다. 표시는 식약처 신고·제품 라벨·사용자 제보를 근거로 하며, 정정 요청을 받습니다.';

/** "외국산" 뒤에 붙는 법적 설명 */
export const FOREIGN_NOTE = '국가 변동 원료, 법상 허용 표기';
/** 표시 의무 없는 원료 문구 */
export const UNDISCLOSED_TEXT = '표시 의무 없음 · 알 수 없음';

/** 알 수 없는 코드(API가 새 국가를 내려줄 때)도 깨지지 않게 조회 */
export function countryInfo(code: string | null | undefined): CountryInfo {
  if (!code) return COUNTRIES.unknown;
  const found = (COUNTRIES as Record<string, CountryInfo | undefined>)[code];
  // 미등록 ISO 코드: 코드를 이름으로 쓰되 국기는 비움(추정 금지)
  return found ?? { name: code, flag: '', originWord: `${code}산` };
}

/** "🇰🇷 한국" / "알 수 없음" */
export function countryLabel(code: string | null | undefined, withFlag = true): string {
  const info = countryInfo(code);
  return withFlag && info.flag ? `${info.flag} ${info.name}` : info.name;
}

// ---------------------------------------------------------------------------
// 배지
// ---------------------------------------------------------------------------

export type OriginLevel = 'manufacturing' | 'brand_owner' | 'ingredient';

export type OriginBadgeLevel =
  | OriginLevel
  /** "4순위 이하 원료: 표시 의무 없음" 같은 미표시 안내 */
  | 'undisclosed'
  /** 고정 면책 문구 */
  | 'notice';

export interface OriginBadge {
  level: OriginBadgeLevel;
  /** 카드에 보여줄 짧은 라벨: 제조국 / 브랜드 / 원재료 */
  label: string;
  /** 완성된 한글 문장 */
  text: string;
  /** 해당 국가(없으면 null). 색상 결정에 쓰지 말 것 — 국기·이름만. */
  country: CountryCode | null;
  flag: string;
  countryName: string;
  /** 원재료 레벨일 때 */
  ingredientName?: string;
  rank?: number | null;
  /** 이 값의 근거 설명("라벨 기준" 등) */
  basis?: string;
  /** OEM 등 부가 설명 */
  note?: string;
}

export interface OriginBadgeOptions {
  /** 화장품은 원료 원산지 표시 의무가 없음 → 안내 문구가 달라짐 */
  category?: ProductCategory;
  /** 고정 면책 문구 배지를 포함할지(기본 true) */
  includeDisclaimer?: boolean;
}

/** 출처 → "(라벨 기준)" 같은 근거 문구 */
export function sourceBasis(source: SourceType | null | undefined): string {
  switch (source) {
    case 'ocr_verified':
      return '라벨 기준';
    case 'ocr_user':
      return '라벨 기준·미검증';
    case 'mfds_c002':
      return '식약처 신고 기준';
    case 'impfood':
      return '식약처 수입신고 기준';
    case 'manufacturer':
      return '제조사 정정 기준';
    case 'curator':
      return '검수 기준';
    case 'koreannet':
      return '코리안넷 기준';
    case 'mfds_i0490':
      return '식약처 기준';
    default:
      return '라벨 기준';
  }
}

/** 제조국/브랜드 국가의 확신 수준 → 근거 문구 */
function confidenceBasis(origin: Origin): string | undefined {
  if (origin.source) return sourceBasis(origin.source);
  switch (origin.confidence) {
    case 'label_read':
      return '라벨 기준';
    case 'ocr':
      return '라벨 OCR 기준';
    case 'inferred':
      return '제조원 주소 추정';
    default:
      return undefined;
  }
}

/**
 * 원재료 한 줄 배지.
 *   KR      → "원재료 중 배추: 국산(라벨 기준)"
 *   CN      → "원재료 중 고춧가루: 중국산(라벨 기준)"
 *   외국산  → "원재료 중 대두: 외국산(국가 변동 원료, 법상 허용 표기)"
 *   unknown → "원재료 중 향료: 표시 의무 없음 · 알 수 없음"
 */
export function ingredientOriginBadge(ing: IngredientOrigin): OriginBadge {
  const info = countryInfo(ing.country);
  const common = {
    level: 'ingredient' as const,
    label: '원재료',
    country: ing.country,
    flag: info.flag,
    countryName: info.name,
    ingredientName: ing.name,
    rank: ing.rank ?? null,
  };

  if (ing.country === 'unknown') {
    return { ...common, text: `원재료 중 ${ing.name}: ${UNDISCLOSED_TEXT}` };
  }
  if (ing.country === '외국산') {
    return {
      ...common,
      text: `원재료 중 ${ing.name}: 외국산(${FOREIGN_NOTE})`,
      note: FOREIGN_NOTE,
    };
  }
  const basis = sourceBasis(ing.source);
  return {
    ...common,
    basis,
    text: `원재료 중 ${ing.name}: ${info.originWord}(${basis})`,
  };
}

/**
 * 원산지 배지 목록. 순서: 제조국 → 브랜드 → 원재료(순위순) → 미표시 안내 → 고정 문구.
 * origin 이 null 이면 "알 수 없음" 배지 + 고정 문구만.
 */
export function originBadges(origin: Origin | null, opts: OriginBadgeOptions = {}): OriginBadge[] {
  const badges: OriginBadge[] = [];
  const includeDisclaimer = opts.includeDisclaimer !== false;

  if (!origin) {
    badges.push({
      level: 'manufacturing',
      label: '제조국',
      text: '제조국: 알 수 없음',
      country: null,
      flag: '',
      countryName: COUNTRIES.unknown.name,
    });
    if (includeDisclaimer) badges.push(disclaimerBadge());
    return badges;
  }

  const basis = confidenceBasis(origin);
  const basisSuffix = basis ? `(${basis})` : '';

  // 1) 제조국 — 항상 "제조국:" 레벨 접두사. 모르면 "알 수 없음".
  const mfg = countryInfo(origin.manufacturing_country);
  const mfgKnown = isKnownCountry(origin.manufacturing_country);
  badges.push({
    level: 'manufacturing',
    label: '제조국',
    country: origin.manufacturing_country,
    flag: mfg.flag,
    countryName: mfg.name,
    basis: mfgKnown ? basis : undefined,
    text: mfgKnown ? `제조국: ${countryLabel(origin.manufacturing_country)}${basisSuffix}` : '제조국: 알 수 없음',
  });

  // 2) 브랜드(책임판매업자) 국가 — OEM 이면 "(OEM 제조국: ○○)" 를 붙인다.
  if (origin.brand_owner_country !== null && origin.brand_owner_country !== undefined) {
    const brand = countryInfo(origin.brand_owner_country);
    const brandKnown = isKnownCountry(origin.brand_owner_country);
    let text = brandKnown ? `브랜드: ${countryLabel(origin.brand_owner_country)}` : '브랜드: 알 수 없음';
    let note: string | undefined;
    if (origin.oem) {
      note = mfgKnown ? `OEM 제조국: ${countryLabel(origin.manufacturing_country)}` : 'OEM 제조국: 알 수 없음';
      text += `(${note})`;
    }
    badges.push({
      level: 'brand_owner',
      label: '브랜드',
      country: origin.brand_owner_country,
      flag: brand.flag,
      countryName: brand.name,
      text,
      note,
    });
  }

  // 3) 원재료별 원산지 — 표시 순위순
  const sortedIngredients = [...origin.ingredients].sort(
    (a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER),
  );
  for (const ing of sortedIngredients) badges.push(ingredientOriginBadge(ing));

  // 4) 미표시 안내
  if (opts.category === 'cosmetic') {
    // 화장품은 원료 원산지 표시 의무가 없다 → 원료 국가를 추정하지 않는다.
    badges.push({
      level: 'undisclosed',
      label: '원료 원산지',
      text: '원료 원산지: 표시 의무 없음',
      country: null,
      flag: '',
      countryName: COUNTRIES.unknown.name,
    });
  } else if (sortedIngredients.length > 0) {
    badges.push({
      level: 'undisclosed',
      label: '원재료',
      text: `4순위 이하 원료: ${UNDISCLOSED_TEXT}`,
      country: null,
      flag: '',
      countryName: COUNTRIES.unknown.name,
      note: origin.undisclosed_note ?? undefined,
    });
  } else {
    badges.push({
      level: 'undisclosed',
      label: '원재료',
      text: '원재료 원산지: 알 수 없음',
      country: null,
      flag: '',
      countryName: COUNTRIES.unknown.name,
      note: origin.undisclosed_note ?? undefined,
    });
  }

  // 5) 고정 면책 문구
  if (includeDisclaimer) badges.push(disclaimerBadge());

  return badges;
}

function disclaimerBadge(): OriginBadge {
  return {
    level: 'notice',
    label: '안내',
    text: ORIGIN_DISCLAIMER,
    country: null,
    flag: '',
    countryName: '',
  };
}

/** 특정 국가로 확정된 값인지(외국산·unknown·null 은 아님) */
export function isKnownCountry(code: CountryCode | null | undefined): code is IsoLike {
  return !!code && code !== 'unknown' && code !== '외국산';
}
type IsoLike = Exclude<CountryCode, 'unknown' | '외국산'>;

/**
 * 결과 카드 한 줄 요약: "제조국: 🇨🇳 중국 · 브랜드: 🇰🇷 한국(OEM 제조국: 🇨🇳 중국)"
 * (docs/05 §7 표의 첫 줄 형태). 원재료 줄은 포함하지 않는다.
 */
export function originSummaryLine(origin: Origin | null): string {
  return originBadges(origin, { includeDisclaimer: false })
    .filter((b) => b.level === 'manufacturing' || b.level === 'brand_owner')
    .map((b) => b.text)
    .join(' · ');
}

// ---------------------------------------------------------------------------
// 특정 국가 관련 여부 (docs/02 §2 M3: "중국 관련이면 어느 레벨인지 명시")
// ---------------------------------------------------------------------------

export interface CountryInvolvement {
  country: CountryCode;
  /** 하나라도 관련되면 true */
  involved: boolean;
  /** 관련된 레벨(순서: manufacturing → brand_owner → ingredient) */
  levels: OriginLevel[];
  /** 해당 국가로 표기된 원재료명 */
  ingredients: string[];
  /** 원산지를 모르는 원재료 수(unknown·외국산) — "관련 없음"으로 단정할 수 없다는 뜻 */
  undisclosedIngredientCount: number;
}

/**
 * 원산지의 어느 레벨이 특정 국가와 관련되는지.
 * `unknown`·`외국산`은 어떤 국가로도 추정하지 않는다(ADR-0005).
 */
export function involvesCountry(origin: Origin | null, country: CountryCode): CountryInvolvement {
  const levels: OriginLevel[] = [];
  const ingredients: string[] = [];
  let undisclosed = 0;

  if (origin && isKnownCountry(country)) {
    if (origin.manufacturing_country === country) levels.push('manufacturing');
    if (origin.brand_owner_country === country) levels.push('brand_owner');
    for (const ing of origin.ingredients) {
      if (ing.country === country) ingredients.push(ing.name);
      else if (!isKnownCountry(ing.country)) undisclosed += 1;
    }
    if (ingredients.length > 0) levels.push('ingredient');
  } else if (origin) {
    for (const ing of origin.ingredients) if (!isKnownCountry(ing.country)) undisclosed += 1;
  }

  return {
    country,
    involved: levels.length > 0,
    levels,
    ingredients,
    undisclosedIngredientCount: undisclosed,
  };
}

/**
 * 관련 레벨을 한글 한 줄로: "제조국 · 원재료(고춧가루)". 관련 없으면 null.
 * 제품 전체를 "○○산"이라 부르지 않고 레벨을 명시한다.
 */
export function involvementText(inv: CountryInvolvement): string | null {
  if (!inv.involved) return null;
  const name = countryInfo(inv.country).name;
  const parts: string[] = [];
  if (inv.levels.includes('manufacturing')) parts.push('제조국');
  if (inv.levels.includes('brand_owner')) parts.push('브랜드');
  if (inv.levels.includes('ingredient')) parts.push(`원재료(${inv.ingredients.join(', ')})`);
  return `${name} 관련: ${parts.join(' · ')}`;
}
