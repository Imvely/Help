/**
 * 기기 로컬 SQLite 캐시 (docs/03-architecture.md §5).
 *
 * - `products` : 바코드 → 제품 응답(JSON 문자열) 캐시. TTL 7일, LRU 5,000건.
 * - `scans`    : 스캔 히스토리(비회원 50건 규칙은 UI 에서 limit 로 처리). `synced` 열은 서버 업로드 여부(M11).
 *
 * expo-sqlite 는 Python 의 sqlite3 와 거의 같은 감각으로 쓸 수 있습니다.
 * 차이점: 모든 호출이 async 이고, `?` 플레이스홀더에 배열로 값을 넘깁니다.
 */
import * as SQLite from 'expo-sqlite';

import type { Product, ScanMethod, ScanRecord } from './types';

const DB_NAME = 'eodisan.db';
export const PRODUCT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7일
export const PRODUCT_MAX_ROWS = 5000;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** DB 를 한 번만 열고(싱글턴) 스키마를 보장합니다. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS products (
          ean13      TEXT PRIMARY KEY,
          product_id TEXT,
          payload    TEXT NOT NULL,
          fetched_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_products_fetched_at ON products(fetched_at);
        CREATE TABLE IF NOT EXISTS scans (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          ean13      TEXT,
          product_id TEXT,
          name       TEXT,
          method     TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at);
      `);
      await migrate(db);
      return db;
    })();
  }
  return dbPromise;
}

/**
 * 스키마 마이그레이션. SQLite 는 `ADD COLUMN IF NOT EXISTS` 가 없어서
 * PRAGMA table_info 로 컬럼 존재 여부를 확인한 뒤 추가합니다(Alembic 의 수동 버전과 같은 역할).
 */
async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(scans)');
  if (!cols.some((c) => c.name === 'synced')) {
    // v2: 서버(/me/scans)에 올렸는지 표시. 기존 행은 0(미동기화)으로 시작합니다.
    await db.execAsync('ALTER TABLE scans ADD COLUMN synced INTEGER NOT NULL DEFAULT 0');
  }
}

// ---------------------------------------------------------------------------
// products 캐시
// ---------------------------------------------------------------------------

export interface CachedProduct {
  product: Product;
  productId: string | null;
  fetchedAt: number;
  /** TTL 을 넘겼는지. 넘겼어도 오프라인 폴백으로는 쓸 수 있습니다. */
  stale: boolean;
}

interface ProductRow {
  product_id: string | null;
  payload: string;
  fetched_at: number;
}

/** 캐시 조회. 히트 시 fetched_at 을 갱신해 LRU 순서를 유지합니다("touch"). */
export async function getCachedProduct(ean13: string): Promise<CachedProduct | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ProductRow>(
    'SELECT product_id, payload, fetched_at FROM products WHERE ean13 = ?',
    [ean13],
  );
  if (!row) return null;

  let product: Product;
  try {
    product = JSON.parse(row.payload) as Product;
  } catch {
    // 손상된 행은 지우고 미스로 처리
    await db.runAsync('DELETE FROM products WHERE ean13 = ?', [ean13]);
    return null;
  }
  return {
    product,
    productId: row.product_id,
    fetchedAt: row.fetched_at,
    stale: Date.now() - row.fetched_at > PRODUCT_TTL_MS,
  };
}

/** 캐시 저장(upsert) 후 LRU 트림. */
export async function putCachedProduct(ean13: string, product: Product): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO products (ean13, product_id, payload, fetched_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(ean13) DO UPDATE SET
       product_id = excluded.product_id,
       payload    = excluded.payload,
       fetched_at = excluded.fetched_at`,
    [ean13, product.product.id, JSON.stringify(product), Date.now()],
  );
  await trimProductCache();
}

/** 가장 오래된 행부터 지워 5,000건을 유지합니다. */
export async function trimProductCache(maxRows: number = PRODUCT_MAX_ROWS): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `DELETE FROM products WHERE ean13 IN (
       SELECT ean13 FROM products ORDER BY fetched_at DESC LIMIT -1 OFFSET ?
     )`,
    [maxRows],
  );
}

export async function clearProductCache(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM products');
}

// ---------------------------------------------------------------------------
// scans 히스토리
// ---------------------------------------------------------------------------

export interface NewScan {
  ean13?: string | null;
  productId?: string | null;
  name?: string | null;
  method: ScanMethod;
}

export async function recordScan(scan: NewScan): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO scans (ean13, product_id, name, method, created_at) VALUES (?, ?, ?, ?, ?)',
    [scan.ean13 ?? null, scan.productId ?? null, scan.name ?? null, scan.method, Date.now()],
  );
}

/** 최신순 히스토리 (기본 50건 = 비회원 한도) */
export async function listScans(limit = 50): Promise<ScanRecord[]> {
  const db = await getDb();
  return db.getAllAsync<ScanRecord>(
    'SELECT id, ean13, product_id, name, method, created_at, synced FROM scans ORDER BY created_at DESC LIMIT ?',
    [limit],
  );
}

/** 서버에 아직 올리지 않은 기록(오래된 순). 동기화(src/data/sync.ts)가 배치로 올립니다. */
export async function listUnsyncedScans(limit = 500): Promise<ScanRecord[]> {
  const db = await getDb();
  return db.getAllAsync<ScanRecord>(
    'SELECT id, ean13, product_id, name, method, created_at, synced FROM scans WHERE synced = 0 ORDER BY created_at ASC LIMIT ?',
    [limit],
  );
}

/** 업로드에 성공한 행을 synced=1 로 표시 */
export async function markScansSynced(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`UPDATE scans SET synced = 1 WHERE id IN (${placeholders})`, ids);
}

export async function clearScans(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM scans');
}
