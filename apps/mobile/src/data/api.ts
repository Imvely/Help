/**
 * 서버 API 클라이언트 (docs/06-api-and-ml.md §2).
 *
 * `fetch` 만 사용하는 얇은 래퍼입니다. 모든 함수는 `signal`(AbortController) 을 받아
 * 화면이 바뀌거나 새 바코드가 들어오면 진행 중인 요청을 취소할 수 있습니다.
 * (Python 의 httpx.AsyncClient + asyncio.CancelledError 와 비슷한 역할)
 *
 * 인증: 로그인(익명 포함) 상태면 `Authorization: Bearer <JWT>` 를 자동으로 붙입니다(src/data/auth.ts).
 *       서버가 비회원을 구분할 수 있도록 `X-Anonymous-Id`(기기 UUID) 도 항상 보냅니다.
 */
import { getAccessToken, getAnonymousId } from './auth';
import type {
  AlternativesResponse,
  CorrectionRequest,
  DeviceRegisterRequest,
  LabelContributionRequest,
  LabelContributionResponse,
  OcrJobResponse,
  OcrSubmitResponse,
  Product,
  ProductSearchResponse,
  ProfileUpsertRequest,
  RecallListResponse,
  RemoteProfile,
  RemoteProfilesResponse,
  ScanMethod,
  ScanUploadRequest,
} from './types';

/**
 * 베이스 URL. `EXPO_PUBLIC_` 접두사가 붙은 환경변수만 앱 번들에 포함됩니다.
 * 실기기에서 로컬 서버를 쓰려면 localhost 대신 PC 의 LAN IP 를 넣으세요.
 * 예) EXPO_PUBLIC_API_URL=http://192.168.0.10:8000/v1
 */
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/v1').replace(
  /\/+$/,
  '',
);

/** RFC 9457 problem+json 형태의 서버 에러 */
export class ApiError extends Error {
  readonly status: number;
  readonly detail?: string;

  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

export function isNotFoundError(err: unknown): boolean {
  return err instanceof ApiError && err.isNotFound;
}

export interface RequestOptions {
  signal?: AbortSignal;
  /** 기본 8초. 바코드 경로는 p95 < 300ms 목표라 길게 둘 이유가 없습니다. */
  timeoutMs?: number;
  /** 스토어의 토큰 대신 쓸 토큰(테스트용). 보통은 비워 둡니다. */
  authToken?: string;
}

/** 요청 타임아웃 + 외부 AbortSignal 을 하나의 signal 로 합칩니다. */
function combineSignals(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
  const cleanup = () => clearTimeout(timer);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }
  controller.signal.addEventListener('abort', cleanup, { once: true });
  return controller.signal;
}

/** 공통 헤더: Accept + 인증 + 비회원 id */
async function baseHeaders(opts: RequestOptions): Promise<Record<string, string>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = opts.authToken ?? getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  headers['X-Anonymous-Id'] = await getAnonymousId();
  return headers;
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail: string | undefined;
    try {
      const problem = (await res.json()) as { title?: string; detail?: string };
      detail = problem.detail ?? problem.title;
    } catch {
      // 본문이 JSON 이 아니면 무시
    }
    throw new ApiError(res.status, detail ?? `HTTP ${res.status}`, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  opts: RequestOptions = {},
): Promise<T> {
  const headers = await baseHeaders(opts);
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: combineSignals(opts.signal, opts.timeoutMs ?? 8000),
  });
  return parseResponse<T>(res);
}

/** 파일 업로드용 multipart 요청. Content-Type 은 fetch 가 boundary 와 함께 자동으로 넣습니다. */
async function requestMultipart<T>(path: string, form: FormData, opts: RequestOptions = {}): Promise<T> {
  const headers = await baseHeaders(opts);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: form,
    signal: combineSignals(opts.signal, opts.timeoutMs ?? 30000), // 사진 업로드는 넉넉히
  });
  return parseResponse<T>(res);
}

// ---------------------------------------------------------------------------
// 제품
// ---------------------------------------------------------------------------

/** GET /products/by-barcode/{ean13} — 바코드 → 제품 요약 카드. 없으면 ApiError(404) */
export function getProductByBarcode(ean13: string, opts?: RequestOptions): Promise<Product> {
  return request<Product>('GET', `/products/by-barcode/${encodeURIComponent(ean13)}`, undefined, opts);
}

/** GET /products/{id} — 상세(원산지·성분·영양·출처) */
export function getProduct(id: string, opts?: RequestOptions): Promise<Product> {
  return request<Product>('GET', `/products/${encodeURIComponent(id)}`, undefined, opts);
}

/** GET /products/search?q= — 텍스트 검색 */
export function searchProducts(q: string, opts?: RequestOptions): Promise<ProductSearchResponse> {
  const params = new URLSearchParams({ q });
  return request<ProductSearchResponse>('GET', `/products/search?${params.toString()}`, undefined, opts);
}

/** GET /products/{id}/alternatives?limit= — 같은 카테고리의 국산·더 나은 등급 제품 (P1-2) */
export function getAlternatives(id: string, limit = 3, opts?: RequestOptions): Promise<AlternativesResponse> {
  return request<AlternativesResponse>(
    'GET',
    `/products/${encodeURIComponent(id)}/alternatives?limit=${limit}`,
    undefined,
    opts,
  );
}

/** GET /recalls?since= — 회수 목록 증분 (since: ISO 날짜/시각) */
export function getRecalls(since?: string, opts?: RequestOptions): Promise<RecallListResponse> {
  const params = new URLSearchParams();
  if (since) params.set('since', since);
  const qs = params.toString();
  return request<RecallListResponse>('GET', `/recalls${qs ? `?${qs}` : ''}`, undefined, opts);
}

// ---------------------------------------------------------------------------
// 제보
// ---------------------------------------------------------------------------

/** POST /contributions/corrections — "정보가 틀려요" 정정 요청 */
export function postCorrection(
  body: CorrectionRequest,
  opts?: RequestOptions,
): Promise<{ id?: string; status?: string } | undefined> {
  return request('POST', '/contributions/corrections', body, opts);
}

/** 업로드할 사진 한 장. RN 의 FormData 는 `{ uri, name, type }` 객체를 파일로 취급합니다. */
export interface UploadImage {
  uri: string;
  name?: string;
  type?: string;
}

/**
 * POST /ocr/label (multipart) — 라벨 사진 업로드 → 202 { job_id, status }.
 * `ean13` / `product_id` 가 있으면 폼 필드로 함께 보내 서버가 어느 제품의 라벨인지 알게 합니다.
 */
export function submitLabelOcr(
  image: UploadImage,
  meta: { ean13?: string; product_id?: string } = {},
  opts?: RequestOptions,
): Promise<OcrSubmitResponse> {
  const form = new FormData();
  // RN 전용 파일 객체. 웹 표준 타입(Blob)과 달라 캐스팅이 필요합니다.
  form.append('image', {
    uri: image.uri,
    name: image.name ?? 'label.jpg',
    type: image.type ?? 'image/jpeg',
  } as unknown as Blob);
  if (meta.ean13) form.append('ean13', meta.ean13);
  if (meta.product_id) form.append('product_id', meta.product_id);
  return requestMultipart<OcrSubmitResponse>('/ocr/label', form, opts);
}

/** GET /ocr/jobs/{job_id} — OCR 작업 상태·결과 */
export function getOcrJob(jobId: string, opts?: RequestOptions): Promise<OcrJobResponse> {
  return request<OcrJobResponse>('GET', `/ocr/jobs/${encodeURIComponent(jobId)}`, undefined, opts);
}

/** POST /contributions/label — 사용자가 확인·수정한 라벨 정보를 제보 → 201 { product_id, created } */
export function submitLabelContribution(
  body: LabelContributionRequest,
  opts?: RequestOptions,
): Promise<LabelContributionResponse> {
  return request<LabelContributionResponse>('POST', '/contributions/label', body, opts);
}

// ---------------------------------------------------------------------------
// 회원 동기화 (/me/*) — Authorization 헤더가 있어야 합니다
// ---------------------------------------------------------------------------

/** GET /me/profiles — 서버에 저장된(암호화된) 프로필 목록. 배열 또는 `{ profiles }` 어느 쪽이 와도 배열로 돌려줍니다. */
export async function getRemoteProfiles(opts?: RequestOptions): Promise<RemoteProfilesResponse> {
  const res = await request<RemoteProfile[] | { profiles?: RemoteProfile[] }>('GET', '/me/profiles', undefined, opts);
  if (Array.isArray(res)) return res;
  return res?.profiles ?? [];
}

/** PUT /me/profiles — 프로필 upsert. 서버가 payload 를 암호화해 저장합니다. */
export function putRemoteProfile(body: ProfileUpsertRequest, opts?: RequestOptions): Promise<RemoteProfile> {
  return request<RemoteProfile>('PUT', '/me/profiles', body, opts);
}

/** POST /me/scans — 아직 올리지 않은 로컬 스캔 기록 업로드(회원). 응답 { added, skipped } */
export function postScans(
  body: ScanUploadRequest,
  opts?: RequestOptions,
): Promise<{ added?: number; skipped?: number } | undefined> {
  return request('POST', '/me/scans', body, opts);
}

/**
 * POST /scans — 비회원 포함 스캔 이벤트 한 건(204). 서버가 "내가 스캔한 제품이 회수되면" 푸시(P1-4)를 보낼 때
 * X-Anonymous-Id 로 기기를 찾는 데 씁니다. 실패해도 무시하는 fire-and-forget 호출입니다.
 */
export function postScanEvent(
  body: { ean13?: string | null; product_id?: string | null; method?: ScanMethod; latency_ms?: number },
  opts?: RequestOptions,
): Promise<void> {
  return request<void>('POST', '/scans', { method: 'barcode', ...body }, { timeoutMs: 5000, ...opts });
}

// ---------------------------------------------------------------------------
// 푸시 (P1-4)
// ---------------------------------------------------------------------------

/** POST /devices — Expo 푸시 토큰 등록(비회원도 가능). `enabled:false` 로 보내면 알림 끔. */
export function registerDevice(
  body: DeviceRegisterRequest,
  opts?: RequestOptions,
): Promise<{ id?: string; enabled?: boolean } | undefined> {
  return request('POST', '/devices', body, opts);
}
