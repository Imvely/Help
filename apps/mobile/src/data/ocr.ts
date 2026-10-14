/**
 * 라벨 OCR 파이프라인의 데이터 쪽 (docs/02 M8, §7 "데이터 기여 루프").
 *
 *   사진(VisionCamera) → 리사이즈/압축(expo-image-manipulator, 긴 변 1600px JPEG)
 *   → POST /ocr/label (202, job_id) → GET /ocr/jobs/{id} 1초 폴링(최대 60초)
 *   → LabelExtraction → 사용자가 확인·수정(app/ocr.tsx) → POST /contributions/label
 *
 * 화면 코드가 단순해지도록 "업로드+폴링" 을 하나의 async 함수로 묶고, 취소는 AbortSignal 로 합니다.
 */
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { getOcrJob, submitLabelOcr } from './api';
import type { LabelExtraction, OcrJobStatus } from './types';

/** 서버 OCR 입력 상한. 이보다 크면 긴 변을 이 값으로 줄입니다(업로드 시간·서버 메모리 절약). */
export const OCR_MAX_LONG_SIDE = 1600;
export const OCR_JPEG_QUALITY = 0.85;
export const OCR_POLL_INTERVAL_MS = 1000;
export const OCR_POLL_TIMEOUT_MS = 60_000;

export interface PreparedPhoto {
  uri: string;
  width: number;
  height: number;
}

/**
 * 촬영 원본을 업로드용 JPEG 으로 만듭니다.
 * VisionCamera 의 `photo.path` 는 스킴이 없을 수 있어 `file://` 를 붙입니다.
 */
export async function prepareLabelPhoto(path: string, width: number, height: number): Promise<PreparedPhoto> {
  const uri = path.startsWith('file://') || path.startsWith('content://') ? path : `file://${path}`;
  const longSide = Math.max(width, height);
  const resize =
    longSide > OCR_MAX_LONG_SIDE
      ? width >= height
        ? { resize: { width: OCR_MAX_LONG_SIDE } }
        : { resize: { height: OCR_MAX_LONG_SIDE } }
      : null;
  const result = await manipulateAsync(uri, resize ? [resize] : [], {
    compress: OCR_JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });
  return { uri: result.uri, width: result.width, height: result.height };
}

export class OcrJobError extends Error {
  readonly status: OcrJobStatus | 'timeout';
  constructor(status: OcrJobStatus | 'timeout', message: string) {
    super(message);
    this.name = 'OcrJobError';
    this.status = status;
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason instanceof Error ? signal.reason : new Error('aborted'));
      },
      { once: true },
    );
  });
}

/** 1초 간격으로 작업 상태를 확인해 done 이면 결과를, failed/timeout 이면 OcrJobError 를 던집니다. */
export async function pollOcrJob(
  jobId: string,
  opts: { signal?: AbortSignal; onStatus?: (status: OcrJobStatus) => void } = {},
): Promise<LabelExtraction> {
  const deadline = Date.now() + OCR_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const job = await getOcrJob(jobId, { signal: opts.signal });
    opts.onStatus?.(job.status);
    if (job.status === 'done') {
      if (!job.result) throw new OcrJobError('failed', '인식 결과가 비어 있어요');
      return normalizeExtraction(job.result);
    }
    if (job.status === 'failed') throw new OcrJobError('failed', job.error ?? '라벨을 읽지 못했어요');
    await sleep(OCR_POLL_INTERVAL_MS, opts.signal);
  }
  throw new OcrJobError('timeout', '인식이 너무 오래 걸려요. 다시 시도해 주세요.');
}

/** 업로드 → 폴링 한 번에. 화면에서는 이 함수 하나만 호출합니다. */
export async function runLabelOcr(
  photo: PreparedPhoto,
  meta: { ean13?: string; product_id?: string },
  opts: { signal?: AbortSignal; onStatus?: (status: OcrJobStatus | 'uploading') => void } = {},
): Promise<{ jobId: string; extraction: LabelExtraction }> {
  opts.onStatus?.('uploading');
  const submitted = await submitLabelOcr({ uri: photo.uri }, meta, { signal: opts.signal });
  opts.onStatus?.(submitted.status);
  const extraction = await pollOcrJob(submitted.job_id, opts);
  return { jobId: submitted.job_id, extraction };
}

/** 서버 응답에 빠진 필드가 있어도 편집 화면이 죽지 않도록 기본값을 채웁니다(Pydantic 의 default 와 같은 역할). */
export function normalizeExtraction(raw: Partial<LabelExtraction>): LabelExtraction {
  return {
    ocr_text: raw.ocr_text ?? '',
    ingredients_raw: raw.ingredients_raw ?? null,
    ingredients: (raw.ingredients ?? []).map((i) => ({
      name: i.name ?? '',
      origin: i.origin ?? null,
      function: i.function ?? null,
      sub_ingredients: i.sub_ingredients ?? [],
    })),
    manufacturing_country: raw.manufacturing_country ?? null,
    manufacturer: raw.manufacturer ?? null,
    brand_owner: raw.brand_owner ?? null,
    caffeine_mg: raw.caffeine_mg ?? null,
    high_caffeine: raw.high_caffeine ?? false,
    allergen_statement: raw.allergen_statement ?? null,
    may_contain_statement: raw.may_contain_statement ?? null,
    allergens_detected: raw.allergens_detected ?? [],
    may_contain_detected: raw.may_contain_detected ?? [],
  };
}

/** 사용자가 아무 것도 못 읽은 사진으로 빈 양식부터 채울 때 쓰는 기본 추출값 */
export function emptyExtraction(): LabelExtraction {
  return normalizeExtraction({});
}
