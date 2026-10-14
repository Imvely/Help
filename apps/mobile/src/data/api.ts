/**
 * 서버 API 클라이언트 (docs/06-api-and-ml.md §2).
 *
 * `fetch` 만 사용하는 얇은 래퍼입니다. 모든 함수는 `signal`(AbortController) 을 받아
 * 화면이 바뀌거나 새 바코드가 들어오면 진행 중인 요청을 취소할 수 있습니다.
 * (Python 의 httpx.AsyncClient + asyncio.CancelledError 와 비슷한 역할)
 */
import type {
  CorrectionRequest,
  Product,
  ProductSearchResponse,
  RecallListResponse,
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

interface RequestOptions {
  signal?: AbortSignal;
  /** 기본 8초. 바코드 경로는 p95 < 300ms 목표라 길게 둘 이유가 없습니다. */
  timeoutMs?: number;
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

async function request<T>(
  method: 'GET' | 'POST' | 'PUT',
  path: string,
  body?: unknown,
  opts: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.authToken) headers.Authorization = `Bearer ${opts.authToken}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: combineSignals(opts.signal, opts.timeoutMs ?? 8000),
  });

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

// ---------------------------------------------------------------------------
// 엔드포인트
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

/** GET /recalls?since= — 회수 목록 증분 (since: ISO 날짜/시각) */
export function getRecalls(since?: string, opts?: RequestOptions): Promise<RecallListResponse> {
  const params = new URLSearchParams();
  if (since) params.set('since', since);
  const qs = params.toString();
  return request<RecallListResponse>('GET', `/recalls${qs ? `?${qs}` : ''}`, undefined, opts);
}

/** POST /contributions/corrections — "정보가 틀려요" 정정 요청 */
export function postCorrection(
  body: CorrectionRequest,
  opts?: RequestOptions,
): Promise<{ id?: string; status?: string } | undefined> {
  return request('POST', '/contributions/corrections', body, opts);
}
