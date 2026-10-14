/**
 * 바코드 → 제품 조회 훅 (docs/03-architecture.md §3 스캔 파이프라인의 "로컬 캐시 → 서버" 구간).
 *
 * TanStack Query 는 "서버 데이터 캐시 + 로딩/에러 상태" 를 관리해 주는 라이브러리입니다.
 * `useQuery` 에 queryKey(캐시 키)와 queryFn(실제 fetch) 을 주면 같은 키의 요청을 합치고,
 * 화면을 떠나면 AbortSignal 로 취소합니다. (Python 으로 치면 functools.lru_cache + asyncio 취소)
 *
 * 흐름: SQLite 캐시 히트(7일 이내) → 즉시 반환 / 미스 → GET /products/by-barcode → 캐시 저장
 *       성공하면 scans 히스토리에 기록. 네트워크 실패 시 오래된 캐시라도 있으면 그걸로 폴백.
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { getProductByBarcode, isNotFoundError } from './api';
import { getCachedProduct, putCachedProduct, recordScan } from './cache';
import type { Product } from './types';

export const productByBarcodeKey = (ean13: string) => ['product', 'by-barcode', ean13] as const;

export interface ProductLookup {
  product: Product;
  /** 'cache' 면 서버를 거치지 않았음 (오프라인 동작) */
  from: 'cache' | 'network' | 'stale-cache';
}

export async function fetchProductByBarcode(ean13: string, signal?: AbortSignal): Promise<ProductLookup> {
  const cached = await getCachedProduct(ean13);
  if (cached && !cached.stale) {
    void recordScan({ ean13, productId: cached.product.product.id, name: cached.product.product.name, method: 'barcode' });
    return { product: cached.product, from: 'cache' };
  }

  try {
    const product = await getProductByBarcode(ean13, { signal });
    await putCachedProduct(ean13, product);
    void recordScan({ ean13, productId: product.product.id, name: product.product.name, method: 'barcode' });
    return { product, from: 'network' };
  } catch (err) {
    // 404 는 "DB 에 없음" 이므로 그대로 올려서 OCR 등록 CTA 를 띄웁니다.
    if (isNotFoundError(err)) throw err;
    // 네트워크 오류: TTL 지난 캐시라도 있으면 보여줍니다.
    if (cached) {
      void recordScan({ ean13, productId: cached.product.product.id, name: cached.product.product.name, method: 'barcode' });
      return { product: cached.product, from: 'stale-cache' };
    }
    throw err;
  }
}

/**
 * @param ean13 null 이면 조회하지 않음(스캔 대기 상태)
 */
export function useProduct(ean13: string | null): UseQueryResult<ProductLookup, Error> {
  return useQuery<ProductLookup, Error>({
    queryKey: productByBarcodeKey(ean13 ?? ''),
    enabled: !!ean13,
    queryFn: ({ signal }) => fetchProductByBarcode(ean13 as string, signal),
    staleTime: 5 * 60 * 1000, // 5분간은 같은 바코드를 다시 비춰도 메모리 캐시로 즉답
    retry: (failureCount, err) => !isNotFoundError(err) && failureCount < 1,
  });
}
