/**
 * 민감하지 않은 앱 설정 (동기화 동의 · 푸시 등록 상태). expo-sqlite/kv-store 에 JSON 으로 저장합니다.
 *
 * 건강 프로필(민감정보)은 여기가 아니라 SecureStore(src/data/profile.ts)에 있습니다.
 * "동의했는지" 자체는 민감정보가 아니므로 일반 저장소면 충분합니다.
 */
import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';

const KEY = 'eodisan.settings.v1';

export interface AppSettings {
  /** 민감정보(프로필) 서버 동기화에 별도 동의했는지 (docs/02 §5 opt-in) */
  syncConsent: boolean;
  /** 서버가 돌려준 프로필 id (PUT /me/profiles 의 upsert 키) */
  remoteProfileId: string | null;
  /** 마지막 프로필 동기화 시각(epoch ms) */
  lastProfileSyncAt: number | null;
  /** 마지막 히스토리 동기화 시각(epoch ms) */
  lastScanSyncAt: number | null;
  /** "회수 알림 받기" 토글 */
  pushEnabled: boolean;
  /** 서버에 등록한 Expo 푸시 토큰 */
  pushToken: string | null;
  pushRegisteredAt: number | null;
}

const DEFAULTS: AppSettings = {
  syncConsent: false,
  remoteProfileId: null,
  lastProfileSyncAt: null,
  lastScanSyncAt: null,
  pushEnabled: false,
  pushToken: null,
  pushRegisteredAt: null,
};

interface SettingsState extends AppSettings {
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<AppSettings>) => Promise<void>;
}

function pick(state: SettingsState): AppSettings {
  return {
    syncConsent: state.syncConsent,
    remoteProfileId: state.remoteProfileId,
    lastProfileSyncAt: state.lastProfileSyncAt,
    lastScanSyncAt: state.lastScanSyncAt,
    pushEnabled: state.pushEnabled,
    pushToken: state.pushToken,
    pushRegisteredAt: state.pushRegisteredAt,
  };
}

export const useSettings = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  loaded: false,

  load: async () => {
    try {
      const json = await Storage.getItemAsync(KEY);
      const parsed = json ? (JSON.parse(json) as Partial<AppSettings>) : {};
      set({ ...DEFAULTS, ...parsed, loaded: true });
    } catch {
      set({ ...DEFAULTS, loaded: true });
    }
  },

  update: async (patch) => {
    set(patch);
    await Storage.setItemAsync(KEY, JSON.stringify(pick({ ...get(), ...patch })));
  },
}));
