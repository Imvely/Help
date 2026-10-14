/**
 * @eodisan/domain — 타입 정의
 *
 * API 응답(docs/06-api-and-ml.md §2 `/products/by-barcode` 예시)과
 * 기기 로컬 건강 프로필(docs/02-product-spec.md §5)의 형태를 정의합니다.
 *
 * 설계 원칙(docs/03-architecture.md §7): 서버는 성분·등급·영양만 내려주고,
 * 개인화 판정은 기기에서 이 패키지가 수행합니다. 따라서 여기에는
 * React·네트워크·저장소 의존이 전혀 없습니다.
 */

// ---------------------------------------------------------------------------
// 국가 코드 (docs/04-data-model.md `ingredient_origins.country`)
// ---------------------------------------------------------------------------

/** ISO 3166-1 alpha-2 중 앱이 한글명·국기를 보유한 국가. */
export type IsoCountryCode =
  | 'KR' | 'CN' | 'US' | 'JP' | 'VN' | 'TH' | 'DE' | 'FR' | 'IT' | 'AU'
  | 'NZ' | 'BR' | 'CL' | 'IN' | 'ID' | 'MY' | 'PH' | 'RU' | 'GB' | 'CA'
  | 'ES' | 'NL' | 'TR' | 'EG' | 'PE' | 'AR' | 'MX';

/**
 * 원산지 값.
 * - `외국산`: 라벨에 "외국산"으로만 표기된 국가 변동 원료(법상 허용 표기).
 * - `unknown`: 표시 의무가 없거나(4순위 이하·첨가물·향료) 아직 모르는 경우.
 *   UI는 반드시 "알 수 없음"으로 보여주고 특정 국가로 추정하지 않습니다(ADR-0005).
 */
export type CountryCode = IsoCountryCode | '외국산' | 'unknown';

// ---------------------------------------------------------------------------
// 출처 (docs/04-data-model.md §2-6 `product_sources`)
// ---------------------------------------------------------------------------

export type SourceType =
  | 'mfds_c002'     // 식약처 품목제조보고
  | 'mfds_i0490'    // 식약처 회수 정보
  | 'impfood'       // 수입식품정보마루
  | 'koreannet'     // 코리안넷
  | 'ocr_user'      // 사용자 라벨 OCR(미검증)
  | 'ocr_verified'  // 3명 이상 동일 값
  | 'manufacturer'  // 제조사 정정 채널
  | 'curator';      // 내부 검수

export interface Source {
  type: SourceType;
  /** ISO 날짜 문자열(YYYY-MM-DD) */
  date?: string | null;
  /** ocr_verified 등에서 동일 값을 확인한 사용자 수 */
  confirmations?: number;
}

// ---------------------------------------------------------------------------
// 제품 기본 정보
// ---------------------------------------------------------------------------

export type ProductCategory = 'food' | 'cosmetic';

export interface ProductInfo {
  id: string;
  name: string;
  brand?: string | null;
  manufacturer?: string | null;
  category: ProductCategory;
  /** 김치류, 토너 … */
  subcategory?: string | null;
  image_url?: string | null;
}

// ---------------------------------------------------------------------------
// 원산지 (docs/04-data-model.md §2-1, ADR-0005)
// ---------------------------------------------------------------------------

/** 원산지 확신 수준: 사람이 라벨 확인 > OCR > 주소로 추정 */
export type OriginConfidence = 'label_read' | 'ocr' | 'inferred';

/** 원재료 단위 원산지 한 줄 (`ingredient_origins`) */
export interface IngredientOrigin {
  /** 원재료명(라벨 표기) */
  name: string;
  /** 라벨 표시 순서(1부터). 식품은 상위 3순위만 표시 의무 */
  rank?: number | null;
  country: CountryCode;
  /** 라벨 원문 예: "고춧가루(중국산)" */
  raw_text?: string | null;
  source?: SourceType | null;
  confirmations?: number;
}

export interface Origin {
  /** 라벨에 적힌 "원산지" (법적 정의가 나라·품목마다 달라 참고용) */
  declared_origin_country?: CountryCode | null;
  /** 실제 공장 국가 */
  manufacturing_country: CountryCode | null;
  manufacturer_name?: string | null;
  manufacturer_country?: CountryCode | null;
  /** 책임판매업자 / 유통전문판매원 국가 */
  brand_owner_country: CountryCode | null;
  brand_owner_name?: string | null;
  /** 제조업자 ≠ 브랜드 */
  oem: boolean;
  /** 원재료별 원산지(상위 순위 위주). 표시 의무 없는 원료는 `unknown` */
  ingredients: IngredientOrigin[];
  /** 예: "4순위 이하 원료는 표시 의무 없음" */
  undisclosed_note?: string | null;
  confidence?: OriginConfidence | null;
  source?: SourceType | null;
}

// ---------------------------------------------------------------------------
// 성분 (docs/05-knowledge-base.md §2 등급표, docs/04 §2-2)
// ---------------------------------------------------------------------------

/** 0 안전 · 1 주의(조건부) · 2 논쟁적 · 3 유해(회피 권장). null = KB 미확인 */
export type Grade = 0 | 1 | 2 | 3;

/** 근거 수준: 🏛 규제결론 / 📚 체계적 문헌 / 🔬 관찰연구 / 🧪 동물·세포 */
export type EvidenceLevel = 'regulatory' | 'systematic' | 'observational' | 'animal_cell';

/** 등급 1(조건부)이 적용되는 집단 */
export type AppliesToGroup = 'pku' | 'child' | 'kidney' | 'pregnancy' | 'pet' | (string & {});

export interface Ingredient {
  id?: string | null;
  /** 정규화된 성분명(한글) */
  name: string;
  /** 라벨 원문 */
  raw_text?: string | null;
  /** 용도: 향미증진제, 감미료, 보존료 … */
  function?: string | null;
  /** 표시 순서 */
  rank?: number | null;
  grade: Grade | null;
  evidence?: EvidenceLevel | null;
  /** 국가별 규제 상태 예: {"KR":"허용","EU":"금지(2022)"} */
  regulatory_status?: Record<string, string> | null;
  applies_to_groups?: AppliesToGroup[] | null;
  /** 초등학생도 읽을 수 있는 2문장 요약 */
  summary_ko?: string | null;
}

/** API `grade_summary` 와 동일한 키 */
export interface GradeSummary {
  '0': number;
  '1': number;
  '2': number;
  '3': number;
  unknown: number;
}

// ---------------------------------------------------------------------------
// 알레르기 (docs/04-data-model.md §2-3, docs/05 §4)
// ---------------------------------------------------------------------------

/**
 * 알레르겐 코드는 점(.)으로 계층을 표현하는 가장 작은 단위 문자열입니다.
 * 예: `egg`, `tree_nut.walnut`, `shellfish.crustacean.shrimp`
 */
export type AllergenCode = string;

export interface Allergens {
  /** 원재료로 사용됨(함량 무관 표시 의무) */
  contains: AllergenCode[];
  /** "같은 제조시설에서 제조" 혼입 가능 문구 */
  may_contain: AllergenCode[];
}

// ---------------------------------------------------------------------------
// 영양 (docs/04 `product_nutrition`, docs/05 §5·§6)
// ---------------------------------------------------------------------------

export interface Nutrition {
  /** 1회 제공량(g 또는 mL) */
  per_serving_g?: number | null;
  kcal?: number | null;
  sodium_mg?: number | null;
  sugar_g?: number | null;
  sat_fat_g?: number | null;
  trans_fat_g?: number | null;
  protein_g?: number | null;
  /** 1회 제공량당 카페인(mg). 라벨 OCR 우선, 없으면 카테고리 추정 */
  caffeine_mg?: number | null;
  caffeine_mg_per_100ml?: number | null;
  /** 액체식품 0.15mg/mL 이상 → 고카페인 표시 의무 */
  high_caffeine?: boolean | null;
  /** 카페인 값의 출처가 추정인지 */
  caffeine_estimated?: boolean | null;
  source?: SourceType | null;
}

// ---------------------------------------------------------------------------
// 회수·판매중지 (식약처 I0490)
// ---------------------------------------------------------------------------

export interface Recall {
  id?: string | null;
  mfds_id?: string | null;
  reason: string;
  /** 식약처 회수 등급(1·2·3등급) */
  grade?: string | null;
  issued_at?: string | null;
}

// ---------------------------------------------------------------------------
// 제품 응답 전체 (엔진이 소비하는 페이로드)
// ---------------------------------------------------------------------------

export interface Product {
  product: ProductInfo;
  origin: Origin | null;
  ingredients: Ingredient[];
  grade_summary?: GradeSummary | null;
  allergens: Allergens;
  nutrition: Nutrition | null;
  recall: Recall | null;
  sources: Source[];
  generated_at?: string | null;
}

/** `Product`의 별칭 — "API 응답 전체"임을 강조할 때 사용 */
export type ProductPayload = Product;

// ---------------------------------------------------------------------------
// 건강 프로필 (docs/02-product-spec.md §5, 기기 로컬 SecureStore)
// ---------------------------------------------------------------------------

export type CaffeineSensitivity = 'normal' | 'sensitive' | 'avoid';
export type SkinType = 'dry' | 'oily' | 'combination' | 'sensitive';

export interface HealthProfile {
  /** 알레르겐 코드 목록(상위 코드 선택 시 하위 전부 포함) */
  allergens: AllergenCode[];
  /** "심한 알레르기" 토글 → 혼입 가능도 경고로 승격 */
  severeAllergy: boolean;
  caffeineSensitivity: CaffeineSensitivity;
  pregnant: boolean;
  nursing: boolean;
  diabetes: boolean;
  hypertension: boolean;
  /** 신장질환 → 인산염 첨가물 경고 */
  kidney: boolean;
  /** 가족 프로필(자녀)의 나이. 설정되면 어린이 규칙 적용 */
  childAgeYears?: number;
  /** 카페인 한도(2.5mg/kg) 계산용 */
  weightKg?: number;
  skinType?: SkinType;
  vegan?: boolean;
}

/** 아무 것도 선택하지 않은 기본 프로필 */
export const EMPTY_PROFILE: Readonly<HealthProfile> = Object.freeze({
  allergens: [],
  severeAllergy: false,
  caffeineSensitivity: 'normal',
  pregnant: false,
  nursing: false,
  diabetes: false,
  hypertension: false,
  kidney: false,
});

/** 부분 입력으로 프로필을 만드는 헬퍼(테스트·온보딩용) */
export function createProfile(partial: Partial<HealthProfile> = {}): HealthProfile {
  return { ...EMPTY_PROFILE, ...partial, allergens: [...(partial.allergens ?? [])] };
}

// ---------------------------------------------------------------------------
// 개인화 경고 결과 (docs/02 §4 "⚠ 내 프로필" 섹션)
// ---------------------------------------------------------------------------

export type WarningSeverity = 'danger' | 'warning' | 'info';

export type WarningKind =
  | 'recall'
  | 'allergen_contains'
  | 'allergen_may_contain'
  | 'caffeine'
  | 'caffeine_high'
  | 'pregnancy_caffeine_limit'
  | 'pregnancy_alcohol'
  | 'pregnancy_cosmetic'
  | 'diabetes_sugar'
  | 'diabetes_sweetener'
  | 'hypertension_sodium'
  | 'kidney_phosphate'
  | 'vegan'
  | 'child_dye'
  | 'grade_3'
  | 'grade_2';

export interface PersonalWarning {
  severity: WarningSeverity;
  kind: WarningKind;
  /** 결과 카드에 그대로 표시할 한글 문장 */
  message: string;
  /** 관련 성분명(있을 때) */
  ingredients?: string[];
  /** 관련 알레르겐 코드(있을 때) */
  allergen?: AllergenCode;
  /** 사용자가 프로필에서 선택한 코드(상위 코드일 수 있음) */
  profileAllergen?: AllergenCode;
  /** 보조 설명(근거·한계) */
  note?: string;
}

export interface PersonalWarnings {
  /** 심각도 순(danger → warning → info), 같은 심각도 안에서는 규칙 순 */
  warnings: PersonalWarning[];
  counts: Record<WarningSeverity, number>;
  /** 가장 높은 심각도(경고 없으면 null) */
  highest: WarningSeverity | null;
}
