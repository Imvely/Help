/**
 * 회원 동기화 (docs/02 M11·M12, §6 "회원: 히스토리 무제한·기기 간 동기화").
 *
 * 원칙 (docs/02 §5): 기기 로컬(SecureStore/SQLite)이 **항상 원본**입니다. 서버는 기기 간 복사본일 뿐이며
 *   - 프로필은 사용자가 "민감정보 동기화"에 **별도 동의**했을 때만 올립니다(PUT /me/profiles, 서버가 암호화).
 *   - 스캔 히스토리는 로그인하면 아직 안 올린 행만 올립니다(POST /me/scans) → SQLite 에 synced=1 표시.
 *
 * 모든 함수는 실패해도 throw 하지 않고 결과 객체를 돌려줍니다(동기화 실패가 앱을 막으면 안 되므로).
 */
import { getRemoteProfiles, postScans, putRemoteProfile } from './api';
import { useAuth } from './auth';
import { listUnsyncedScans, markScansSynced } from './cache';
import { profileHasSettings, useProfile } from './profile';
import { useSettings } from './settings';
import type { HealthProfile, ScanUpload } from './types';

const PROFILE_LABEL = '기본';

export interface SyncResult {
  ok: boolean;
  /** 올린 건수(스캔) 또는 1(프로필) */
  uploaded: number;
  /** 서버 프로필을 받아 로컬에 적용했으면 true */
  pulled?: boolean;
  error?: string;
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** 회원(소셜 로그인 완료) 상태인지. 익명 세션은 동기화 대상이 아닙니다. */
export function canSync(): boolean {
  return useAuth.getState().isMember;
}

// ---------------------------------------------------------------------------
// 프로필
// ---------------------------------------------------------------------------

/**
 * 로컬 프로필을 서버로 올립니다(동의 + 회원일 때만).
 * 서버가 돌려준 id 를 저장해 다음부터는 같은 행을 갱신(upsert)합니다.
 */
export async function pushProfile(): Promise<SyncResult> {
  const settings = useSettings.getState();
  if (!settings.syncConsent) return { ok: false, uploaded: 0, error: '동기화 동의 없음' };
  if (!canSync()) return { ok: false, uploaded: 0, error: '로그인 필요' };
  try {
    const profile = useProfile.getState().profile;
    const saved = await putRemoteProfile({
      id: settings.remoteProfileId ?? undefined,
      label: PROFILE_LABEL,
      payload: JSON.stringify(profile),
      sync_consent: true,
    });
    await settings.update({ remoteProfileId: saved?.id ?? settings.remoteProfileId, lastProfileSyncAt: Date.now() });
    return { ok: true, uploaded: 1 };
  } catch (err) {
    return { ok: false, uploaded: 0, error: errMessage(err) };
  }
}

/**
 * 로그인 직후 병합: 서버에 프로필이 있고 **로컬이 비어 있으면** 서버 것을 받아 적용하고,
 * 로컬에 설정이 있으면 로컬을 올립니다(로컬 우선). 둘 다 비어 있으면 아무 것도 하지 않습니다.
 */
export async function mergeProfileOnLogin(): Promise<SyncResult> {
  const settings = useSettings.getState();
  if (!settings.syncConsent) return { ok: true, uploaded: 0 };
  if (!canSync()) return { ok: false, uploaded: 0, error: '로그인 필요' };
  try {
    const remote = await getRemoteProfiles();
    const mine = remote.profiles.find((p) => p.label === PROFILE_LABEL) ?? remote.profiles[0];
    const local = useProfile.getState().profile;

    if (mine && !profileHasSettings(local)) {
      let parsed: Partial<HealthProfile> | null = null;
      try {
        parsed = JSON.parse(mine.payload) as Partial<HealthProfile>;
      } catch {
        parsed = null;
      }
      if (parsed) {
        await useProfile.getState().update(parsed);
        await settings.update({ remoteProfileId: mine.id, lastProfileSyncAt: Date.now() });
        return { ok: true, uploaded: 0, pulled: true };
      }
    }
    if (mine && !settings.remoteProfileId) await settings.update({ remoteProfileId: mine.id });
    if (profileHasSettings(local)) return pushProfile();
    return { ok: true, uploaded: 0 };
  } catch (err) {
    return { ok: false, uploaded: 0, error: errMessage(err) };
  }
}

// ---------------------------------------------------------------------------
// 스캔 히스토리
// ---------------------------------------------------------------------------

/** 아직 올리지 않은 스캔 기록을 배치 업로드하고 synced=1 로 표시합니다. */
export async function pushScans(): Promise<SyncResult> {
  if (!canSync()) return { ok: false, uploaded: 0, error: '로그인 필요' };
  try {
    const rows = await listUnsyncedScans();
    if (rows.length === 0) return { ok: true, uploaded: 0 };
    const scans: ScanUpload[] = rows.map((r) => ({
      ean13: r.ean13,
      product_id: r.product_id,
      method: r.method,
      created_at: new Date(r.created_at).toISOString(),
    }));
    await postScans({ scans });
    await markScansSynced(rows.map((r) => r.id));
    await useSettings.getState().update({ lastScanSyncAt: Date.now() });
    return { ok: true, uploaded: rows.length };
  } catch (err) {
    return { ok: false, uploaded: 0, error: errMessage(err) };
  }
}

/** 로그인(익명→회원 승격) 직후 한 번 호출: 히스토리 올리기 + 프로필 병합 */
export async function syncOnLogin(): Promise<{ scans: SyncResult; profile: SyncResult }> {
  const [scans, profile] = await Promise.all([pushScans(), mergeProfileOnLogin()]);
  return { scans, profile };
}
