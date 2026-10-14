/**
 * API 응답 타입 (docs/06-api-and-ml.md §2 `/products/by-barcode` 예시 기준).
 *
 * packages/domain(@eodisan/domain) 의 `src/types.ts` 와 동일한 형태를 유지합니다.
 * 패키지가 빌드·배포되면 이 파일의 타입을 `export type { ... } from '@eodisan/domain'` 로
 * 바꿔 한 곳만 관리하면 됩니다. (TODO: @eodisan/domain 발행 후 교체)
 *
 * Python 개발자를 위한 메모: `interface` 는 dataclass/TypedDict 와 비슷한 "모양 선언"이고,
 * 런타임에는 아무 코드도 남지 않습니다. `?:` 는 Optional 필드입니다.
 */

// ---------------------------------------------------------------------------
// 국가 코드
// ---------------------------------------------------------------------------

/** ISO 3166-1 alpha-2 중 앱이 한글명·국기를 보유한 국가. */
export type IsoCountryCode =
  | 'KR' | 'CN' | 'US' | 'JP' | 'VN' | 'TH' | 'DE' | 'FR' | 'IT' | 'AU'
  | 'NZ' | 'BR' | 'CL' | 'IN' | 'ID' | 'MY' | 'PH' | 'RU' | 'GB' | 'CA'
  | 'ES' | 'NL' | 'TR' | 'EG' | 'PE' | 'AR' | 'MX';

/**
 * 원산지 값.
 * - `외국산`: 라벨에 "외국산"으로만 표기된 국가 변동 원료.
 * - `unknown`: 표시 의무가 없거나(4순위 이하·첨가물·향료) 아직 모르는 경우.
 *   UI는 반드시 "알 수 없음"으로 보여주고 특정 국가로 추정하지 않습니다.
 */
export type CountryCode = IsoCountryCode | '외국산' | 'unknown';

// ---------------------------------------------------------------------------
// 출처
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
// 원산지
// ---------------------------------------------------------------------------

export type OriginConfidence = 'label_read' | 'ocr' | 'inferred';

export interface IngredientOrigin {
  name: string;
  /** 라벨 표시 순서(1부터). 식품은 상위 3순위만 표시 의무 */
  rank?: number | null;
  country: CountryCode;
  raw_text?: string | null;
  source?: SourceType | null;
  confirmations?: number;
}

export interface Origin {
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
  ingredients: IngredientOrigin[];
  /** 예: "4순위 이하 원료는 표시 의무 없음" */
  undisclosed_note?: string | null;
  confidence?: OriginConfidence | null;
  source?: SourceType | null;
}

// ---------------------------------------------------------------------------
// 성분
// ---------------------------------------------------------------------------

/** 0 안전 · 1 주의 · 2 논쟁 · 3 유해. null = KB 미확인 */
export type Grade = 0 | 1 | 2 | 3;

/** 근거 수준: 🏛 규제결론 / 📚 체계적 문헌 / 🔬 관찰연구 / 🧪 동물·세포 */
export type EvidenceLevel = 'regulatory' | 'systematic' | 'observational' | 'animal_cell';

export type AppliesToGroup = 'pku' | 'child' | 'kidney' | 'pregnancy' | 'pet' | (string & {});

export interface Ingredient {
  id?: string | null;
  name: string;
  raw_text?: string | null;
  function?: string | null;
  rank?: number | null;
  grade: Grade | null;
  evidence?: EvidenceLevel | null;
  regulatory_status?: Record<string, string> | null;
  applies_to_groups?: AppliesToGroup[] | null;
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
// 알레르기
// ---------------------------------------------------------------------------

/** 점(.)으로 계층을 표현: `egg`, `tree_nut.walnut`, `shellfish.crustacean.shrimp` */
export type AllergenCode = string;

export interface Allergens {
  contains: AllergenCode[];
  may_contain: AllergenCode[];
}

// ---------------------------------------------------------------------------
// 영양
// ---------------------------------------------------------------------------

export interface Nutrition {
  per_serving_g?: number | null;
  kcal?: number | null;
  sodium_mg?: number | null;
  sugar_g?: number | null;
  sat_fat_g?: number | null;
  trans_fat_g?: number | null;
  protein_g?: number | null;
  caffeine_mg?: number | null;
  caffeine_mg_per_100ml?: number | null;
  high_caffeine?: boolean | null;
  caffeine_estimated?: boolean | null;
  source?: SourceType | null;
}

// ---------------------------------------------------------------------------
// 회수·판매중지
// ---------------------------------------------------------------------------

export interface Recall {
  id?: string | null;
  mfds_id?: string | null;
  reason: string;
  grade?: string | null;
  issued_at?: string | null;
}

// ---------------------------------------------------------------------------
// 제품 응답 전체
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

export type ProductPayload = Product;

/** `/products/search?q=` 응답 한 줄 (요약) */
export interface ProductSearchHit {
  id: string;
  name: string;
  brand?: string | null;
  category?: ProductCategory | null;
  image_url?: string | null;
  ean13?: string | null;
}

/** 서버(apps/api schemas.SearchResponse)와 1:1: { query, hits } */
export interface ProductSearchResponse {
  query: string;
  hits: ProductSearchHit[];
}

/** `/recalls?since=` 응답은 RecallOut 배열(apps/api schemas.RecallOut) */
export type RecallListResponse = (Recall & { product_name?: string; company_name?: string | null })[];

/** `/contributions/corrections` 요청 본문 */
export interface CorrectionRequest {
  product_id: string;
  /** 어떤 항목이 틀렸는지: origin / ingredients / allergens / nutrition / other */
  field: 'origin' | 'ingredients' | 'allergens' | 'nutrition' | 'name' | 'other';
  memo: string;
  /** 사진 업로드는 후속 작업(멀티파트) — 지금은 URL 자리만 둡니다 */
  image_url?: string | null;
}

// ---------------------------------------------------------------------------
// 건강 프로필 (기기 로컬 SecureStore)
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
  kidney: boolean;
  childAgeYears?: number;
  weightKg?: number;
  skinType?: SkinType;
  vegan?: boolean;
}

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

// ---------------------------------------------------------------------------
// 개인화 경고 결과 ("⚠ 내 프로필" 섹션)
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
  ingredients?: string[];
  allergen?: AllergenCode;
  profileAllergen?: AllergenCode;
  note?: string;
}

export interface PersonalWarnings {
  warnings: PersonalWarning[];
  counts: Record<WarningSeverity, number>;
  highest: WarningSeverity | null;
}

// ---------------------------------------------------------------------------
// 로컬 히스토리 (SQLite `scans` 테이블)
// ---------------------------------------------------------------------------

export type ScanMethod = 'barcode' | 'image' | 'ocr' | 'search';

export interface ScanRecord {
  id: number;
  ean13: string | null;
  product_id: string | null;
  name: string | null;
  method: ScanMethod;
  /** epoch ms */
  created_at: number;
}
