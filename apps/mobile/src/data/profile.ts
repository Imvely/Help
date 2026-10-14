/**
 * 건강 프로필 저장소 (docs/02-product-spec.md §5, docs/03 §7).
 *
 * 프로필은 서버가 아니라 기기의 안전한 저장소(iOS Keychain / Android Keystore)에만 둡니다.
 * expo-secure-store 는 key-value 문자열만 저장하므로 JSON 으로 직렬화합니다.
 *
 * `zustand` 는 아주 작은 전역 상태 라이브러리입니다. `useProfile()` 을 어느 컴포넌트에서든 호출하면
 * 같은 상태를 공유하고, 값이 바뀌면 그 컴포넌트가 다시 그려집니다. (Redux 보다 훨씬 단순)
 */
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { EMPTY_PROFILE, type HealthProfile } from './types';

const STORAGE_KEY = 'eodisan.health_profile.v1';

/** 기본 프로필: 아무 것도 선택하지 않은 상태 */
export const DEFAULT_PROFILE: HealthProfile = { ...EMPTY_PROFILE, allergens: [] };

/** 저장된 JSON 이 깨졌거나 구버전이어도 앱이 죽지 않도록 안전하게 병합합니다. */
function normalizeProfile(raw: unknown): HealthProfile {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PROFILE };
  const r = raw as Partial<HealthProfile>;
  return {
    ...DEFAULT_PROFILE,
    ...r,
    allergens: Array.isArray(r.allergens) ? r.allergens.filter((a) => typeof a === 'string') : [],
  };
}

export async function loadProfileFromStore(): Promise<HealthProfile> {
  try {
    const json = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!json) return { ...DEFAULT_PROFILE };
    return normalizeProfile(JSON.parse(json));
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export async function saveProfileToStore(profile: HealthProfile): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(profile));
}

export async function deleteProfileFromStore(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}

interface ProfileState {
  profile: HealthProfile;
  /** SecureStore 에서 한 번 읽어왔는지 */
  loaded: boolean;
  load: () => Promise<void>;
  /** 일부 필드만 바꾸고 즉시 저장 */
  update: (patch: Partial<HealthProfile>) => Promise<void>;
  toggleAllergen: (code: string) => Promise<void>;
  reset: () => Promise<void>;
}

export const useProfile = create<ProfileState>((set, get) => ({
  profile: { ...DEFAULT_PROFILE },
  loaded: false,

  load: async () => {
    const profile = await loadProfileFromStore();
    set({ profile, loaded: true });
  },

  update: async (patch) => {
    const next = normalizeProfile({ ...get().profile, ...patch });
    set({ profile: next });
    await saveProfileToStore(next);
  },

  toggleAllergen: async (code) => {
    const current = get().profile.allergens;
    const allergens = current.includes(code) ? current.filter((c) => c !== code) : [...current, code];
    await get().update({ allergens });
  },

  reset: async () => {
    set({ profile: { ...DEFAULT_PROFILE } });
    await deleteProfileFromStore();
  },
}));

/** 프로필에 경고를 낼 만한 설정이 하나라도 있는지 (카드의 "내 프로필" 섹션 표시 여부) */
export function profileHasSettings(p: HealthProfile): boolean {
  return (
    p.allergens.length > 0 ||
    p.caffeineSensitivity !== 'normal' ||
    p.pregnant ||
    p.nursing ||
    p.diabetes ||
    p.hypertension ||
    p.kidney ||
    !!p.vegan ||
    p.childAgeYears !== undefined
  );
}
