/**
 * API 응답·요청 타입 (docs/06-api-and-ml.md §2).
 *
 * 제품·원산지·성분·프로필처럼 판정 엔진과 **완전히 같은 형태**인 타입은 `@eodisan/domain` 에서 다시 내보냅니다
 * (두 곳에 복사해 두면 한쪽만 고쳐져 어긋나기 쉽습니다). 이 파일에는 앱/서버 계약에만 있는 타입
 * (검색·정정·OCR·동기화·푸시·대체 제품·로컬 히스토리)만 둡니다.
 *
 * Python 개발자를 위한 메모: `interface` 는 dataclass/TypedDict 와 비슷한 "모양 선언"이고,
 * 런타임에는 아무 코드도 남지 않습니다. `?:` 는 Optional 필드, `A | B` 는 Union 입니다.
 */

import type { GradeSummary, ProductCategory, ProductInfo, Recall } from '@eodisan/domain';

// ---------------------------------------------------------------------------
// 판정 엔진과 공유하는 타입 (단일 출처 = packages/domain/src/types.ts)
// ---------------------------------------------------------------------------

export type {
  IsoCountryCode,
  CountryCode,
  SourceType,
  Source,
  ProductCategory,
  ProductInfo,
  OriginConfidence,
  IngredientOrigin,
  Origin,
  Grade,
  EvidenceLevel,
  AppliesToGroup,
  Ingredient,
  GradeSummary,
  AllergenCode,
  Allergens,
  Nutrition,
  Recall,
  Product,
  ProductPayload,
  CaffeineSensitivity,
  SkinType,
  HealthProfile,
  WarningSeverity,
  WarningKind,
  PersonalWarning,
  PersonalWarnings,
} from '@eodisan/domain';

export { EMPTY_PROFILE } from '@eodisan/domain';

// ---------------------------------------------------------------------------
// 검색 · 회수 · 정정 요청
// ---------------------------------------------------------------------------

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

/** 서버 schemas.ProductBrief — 목록·대체 제품 카드에 쓰는 요약 */
export type ProductBrief = ProductInfo;

// ---------------------------------------------------------------------------
// 라벨 OCR (M8): POST /ocr/label → GET /ocr/jobs/{id} → POST /contributions/label
// ---------------------------------------------------------------------------

export type OcrJobStatus = 'queued' | 'running' | 'done' | 'failed';

/**
 * OCR 가 구조화한 원재료 한 줄.
 * `origin` 은 서버가 정규화한 값 — ISO 코드("KR","CN"…) 또는 "외국산" — 이지만, 사용자가 직접 입력하면
 * "중국산" 같은 라벨 표기가 그대로 갈 수도 있습니다. 서버(contributions._norm_country)가 둘 다 받습니다.
 */
export interface ExtractedIngredient {
  name: string;
  origin: string | null;
  function: string | null;
  sub_ingredients: string[];
}

/** 서버 OCR + 구조화 결과. 사용자가 확인·수정한 뒤 그대로 제보 본문에 넣습니다. */
export interface LabelExtraction {
  ocr_text: string;
  ingredients_raw: string | null;
  ingredients: ExtractedIngredient[];
  manufacturing_country: string | null;
  manufacturer: string | null;
  brand_owner: string | null;
  caffeine_mg: number | null;
  high_caffeine: boolean;
  allergen_statement: string | null;
  may_contain_statement: string | null;
  /** 알레르겐 코드(@eodisan/domain 의 KR_MANDATORY_ALLERGENS 와 같은 체계) */
  allergens_detected: string[];
  may_contain_detected: string[];
  /** 앞면/라벨에서 읽은 제품명(있으면 신규 제품 입력란에 미리 채움). 서버 ocr_worker 가 추가로 내려줍니다. */
  product_name?: string | null;
  /** '원산지:' 라인 원문(참고용) */
  country_of_origin?: string | null;
}

/** POST /ocr/label 202 응답 */
export interface OcrSubmitResponse {
  job_id: string;
  status: OcrJobStatus;
}

/** GET /ocr/jobs/{job_id} 응답 */
export interface OcrJobResponse {
  job_id: string;
  status: OcrJobStatus;
  result: LabelExtraction | null;
  error?: string;
}

/** POST /contributions/label 요청 본문 */
export interface LabelContributionRequest {
  job_id: string;
  ean13?: string;
  product_id?: string;
  /** product_id 가 없을 때(신규 제품) 필수 */
  product_name?: string;
  brand?: string;
  category?: ProductCategory;
  extraction: LabelExtraction;
}

/** POST /contributions/label 201 응답 */
export interface LabelContributionResponse {
  product_id: string;
  /** true 면 이번 제보로 제품이 새로 만들어짐 */
  created: boolean;
  /** ocr_user(미검증) | ocr_verified(3명 이상 일치) */
  source?: string;
  /** 같은 값을 제보한 사용자 수 */
  confirmations?: number;
}

// ---------------------------------------------------------------------------
// 동기화 (M11/M12): /me/profiles, /me/scans
// ---------------------------------------------------------------------------

/** 서버에 저장된 프로필 한 건. `payload` 는 HealthProfile 의 JSON 문자열(서버가 암호화해 보관) */
export interface RemoteProfile {
  id: string;
  label: string;
  payload: string;
  sync_consent: boolean;
  updated_at?: string | null;
}

/** 서버는 배열을 그대로 돌려줍니다(list[ProfileOut]). api.ts 가 `{ profiles }` 래퍼도 받아 배열로 통일합니다. */
export type RemoteProfilesResponse = RemoteProfile[];

/** PUT /me/profiles 요청 본문 */
export interface ProfileUpsertRequest {
  id?: string;
  label: string;
  payload: string;
  sync_consent: true;
}

/** POST /me/scans 요청의 한 줄 */
export interface ScanUpload {
  /** 기기별 중복 방지 키(최대 36자). 같은 행을 두 번 올려도 서버가 건너뜁니다. */
  client_id: string;
  ean13: string | null;
  product_id: string | null;
  method: ScanMethod;
  /** ISO 8601 */
  created_at: string;
}

export interface ScanUploadRequest {
  scans: ScanUpload[];
}

// ---------------------------------------------------------------------------
// 푸시 (P1-4): POST /devices
// ---------------------------------------------------------------------------

export interface DeviceRegisterRequest {
  expo_push_token: string;
  platform: 'ios' | 'android';
  /** false 면 알림 끄기(토큰은 유지) */
  enabled?: boolean;
}

// ---------------------------------------------------------------------------
// 대체 제품 (P1-2): GET /products/{id}/alternatives
// ---------------------------------------------------------------------------

export interface Alternative {
  product: ProductBrief;
  grade_summary: GradeSummary;
  manufacturing_country: string | null;
  /** 추천 이유 한 줄 ("제조국 한국 · 유해 등급 성분 0개") */
  reason: string;
}

export interface AlternativesResponse {
  alternatives: Alternative[];
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
  /** 서버(/me/scans)에 올라갔으면 1 */
  synced: number;
}
