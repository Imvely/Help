/**
 * 인증 (docs/02 M11, docs/03 §7). Supabase Auth 를 씁니다.
 *
 * 흐름: 앱 첫 실행 → 익명 세션(signInAnonymously) → 로그인 버튼(카카오/Google/Apple)
 *       → 익명 계정에 신원 연결(linkIdentity) → 로컬 히스토리·프로필 동기화(src/data/sync.ts).
 *
 * `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` 가 없으면 `authAvailable=false` 이고
 * 모든 함수는 조용히 아무 것도 하지 않습니다(UI 는 "로그인은 준비 중입니다" 표시). 앱의 핵심 기능은 로그인 없이 동작합니다.
 *
 * Python 개발자를 위한 메모: Supabase 는 Firebase 비슷한 BaaS 이고, 아래 `supabase.auth.*` 는 모두 HTTP 호출입니다.
 * 세션(JWT) 은 expo-sqlite 의 key-value 저장소에 보관되어 앱을 껐다 켜도 유지됩니다.
 */
import 'react-native-url-polyfill/auto'; // RN 의 URL 구현이 불완전해 supabase-js 가 요구하는 폴리필
import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import Storage from 'expo-sqlite/kv-store';
import * as WebBrowser from 'expo-web-browser';
import { AppState, Platform } from 'react-native';
import { create } from 'zustand';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** 서버 설정이 있어야 true. false 면 프로필 화면에 "로그인은 준비 중입니다(서버 설정 필요)" 를 띄웁니다. */
export const authAvailable = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

export type OAuthProvider = 'kakao' | 'google';

// ---------------------------------------------------------------------------
// Supabase 클라이언트 (설정이 없으면 null)
// ---------------------------------------------------------------------------

/** supabase-js 가 요구하는 AsyncStorage 모양의 어댑터. expo-sqlite/kv-store 를 그대로 씁니다. */
const sessionStorage = {
  getItem: (key: string) => Storage.getItemAsync(key),
  setItem: (key: string, value: string) => Storage.setItemAsync(key, value),
  removeItem: async (key: string) => {
    await Storage.removeItemAsync(key);
  },
};

export const supabase: SupabaseClient | null = authAvailable
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: sessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // 브라우저용 옵션. 모바일은 아래에서 콜백 URL 을 직접 파싱합니다.
        flowType: 'pkce', // OAuth 콜백에 code 가 오고 exchangeCodeForSession 으로 바꿉니다.
      },
    })
  : null;

// 앱이 포그라운드일 때만 토큰 자동 갱신 타이머를 돌립니다(Supabase 권장 패턴).
if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });
}

// ---------------------------------------------------------------------------
// 비회원 식별자 (서버의 X-Anonymous-Id 헤더). 기기당 한 번 만들어 SecureStore 에 보관.
// ---------------------------------------------------------------------------

const ANON_ID_KEY = 'eodisan.anonymous_id.v1';
let anonymousIdCache: string | null = null;

/** RFC 4122 v4 형태의 임의 UUID. 보안 토큰이 아니라 기기 구분용이라 Math.random 으로 충분합니다. */
function randomUuid(): string {
  const hex = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 36; i += 1) {
    if (i === 8 || i === 13 || i === 18 || i === 23) out += '-';
    else if (i === 14) out += '4';
    else if (i === 19) out += hex[(Math.random() * 4) | 8];
    else out += hex[(Math.random() * 16) | 0];
  }
  return out;
}

export async function getAnonymousId(): Promise<string> {
  if (anonymousIdCache) return anonymousIdCache;
  try {
    const existing = await SecureStore.getItemAsync(ANON_ID_KEY);
    if (existing) {
      anonymousIdCache = existing;
      return existing;
    }
    const fresh = randomUuid();
    await SecureStore.setItemAsync(ANON_ID_KEY, fresh);
    anonymousIdCache = fresh;
    return fresh;
  } catch {
    anonymousIdCache = anonymousIdCache ?? randomUuid();
    return anonymousIdCache;
  }
}

// ---------------------------------------------------------------------------
// zustand 스토어: 세션 + 액세스 토큰
// ---------------------------------------------------------------------------

interface AuthState {
  /** 서버 설정 유무 (authAvailable 과 동일, 컴포넌트에서 편하게 쓰기 위해 포함) */
  available: boolean;
  status: 'idle' | 'loading' | 'ready';
  session: Session | null;
  user: User | null;
  /** API 요청에 `Authorization: Bearer` 로 붙는 JWT */
  accessToken: string | null;
  /** 익명 세션(로그인 전) */
  isAnonymous: boolean;
  /** 소셜 로그인으로 승격된 회원 */
  isMember: boolean;
  /** 마지막 로그인 시도 오류 메시지(한글) */
  error: string | null;
  /** 앱 시작 시 한 번: 저장된 세션 복원, 없으면 익명 로그인 */
  init: () => Promise<void>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>;
  /** iOS 전용 Sign in with Apple (ID 토큰 방식) */
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
}

function deriveFromSession(session: Session | null): Pick<AuthState, 'session' | 'user' | 'accessToken' | 'isAnonymous' | 'isMember'> {
  const user = session?.user ?? null;
  const isAnonymous = !!user && user.is_anonymous === true;
  return {
    session,
    user,
    accessToken: session?.access_token ?? null,
    isAnonymous,
    isMember: !!user && !isAnonymous,
  };
}

/** 로그인 콜백 URL 에서 code(PKCE) 또는 access_token/refresh_token(implicit) 을 꺼냅니다. */
function parseAuthCallback(url: string): { code?: string; accessToken?: string; refreshToken?: string; error?: string } {
  const out: { code?: string; accessToken?: string; refreshToken?: string; error?: string } = {};
  const [, afterHash = ''] = url.split('#');
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : '';
  for (const part of [query, afterHash]) {
    if (!part) continue;
    const params = new URLSearchParams(part);
    out.code = out.code ?? params.get('code') ?? undefined;
    out.accessToken = out.accessToken ?? params.get('access_token') ?? undefined;
    out.refreshToken = out.refreshToken ?? params.get('refresh_token') ?? undefined;
    out.error = out.error ?? params.get('error_description') ?? params.get('error') ?? undefined;
  }
  return out;
}

const PROVIDER_LABELS: Record<OAuthProvider, string> = { kakao: '카카오', google: 'Google' };

export const useAuth = create<AuthState>((set, get) => ({
  available: authAvailable,
  status: 'idle',
  ...deriveFromSession(null),
  error: null,

  init: async () => {
    if (!supabase || get().status !== 'idle') return;
    set({ status: 'loading' });
    try {
      const { data } = await supabase.auth.getSession();
      let session = data.session;
      if (!session) {
        // 첫 실행: 익명 세션. 이후 소셜 로그인으로 승격하면 같은 user id 가 유지됩니다(linkIdentity).
        const anon = await supabase.auth.signInAnonymously();
        session = anon.data.session;
      }
      set({ ...deriveFromSession(session), status: 'ready' });
    } catch (err) {
      set({ status: 'ready', error: err instanceof Error ? err.message : String(err) });
    }
    // 토큰 갱신·로그아웃 등 모든 세션 변화를 스토어에 반영
    supabase.auth.onAuthStateChange((_event, session) => {
      set(deriveFromSession(session));
    });
  },

  signInWithOAuth: async (provider) => {
    if (!supabase) return;
    set({ error: null });
    try {
      const redirectTo = Linking.createURL('auth/callback'); // eodisan://auth/callback
      const options = { redirectTo, skipBrowserRedirect: true };
      // 익명 세션이면 linkIdentity 로 승격(기존 user id 유지), 아니면 일반 OAuth 로그인
      const { data, error } = get().isAnonymous
        ? await supabase.auth.linkIdentity({ provider, options })
        : await supabase.auth.signInWithOAuth({ provider, options });
      if (error) throw error;
      if (!data.url) throw new Error('로그인 URL 을 받지 못했습니다');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success') return; // 사용자가 취소

      const parsed = parseAuthCallback(result.url);
      if (parsed.error) throw new Error(parsed.error);
      if (parsed.code) {
        const ex = await supabase.auth.exchangeCodeForSession(parsed.code);
        if (ex.error) throw ex.error;
      } else if (parsed.accessToken && parsed.refreshToken) {
        const st = await supabase.auth.setSession({ access_token: parsed.accessToken, refresh_token: parsed.refreshToken });
        if (st.error) throw st.error;
      } else {
        throw new Error('로그인 응답에 토큰이 없습니다');
      }
    } catch (err) {
      set({ error: `${PROVIDER_LABELS[provider]} 로그인 실패: ${err instanceof Error ? err.message : String(err)}` });
    }
  },

  signInWithApple: async () => {
    if (!supabase || Platform.OS !== 'ios') return;
    set({ error: null });
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('Apple ID 토큰이 없습니다');
      // 주의: ID 토큰 방식은 linkIdentity 가 아니라 새 세션입니다. 익명 세션의 서버측 데이터는 이어지지 않지만
      // 로컬 SQLite 히스토리는 로그인 직후 /me/scans 로 올라가므로 사용자 입장에서는 병합됩니다.
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken });
      if (error) throw error;
    } catch (err) {
      const e = err as { code?: string; message?: string };
      if (e.code === 'ERR_REQUEST_CANCELED') return; // 사용자가 취소
      set({ error: `Apple 로그인 실패: ${e.message ?? String(err)}` });
    }
  },

  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    // 로그아웃 후에도 비회원 기능은 계속 써야 하므로 다시 익명 세션을 만듭니다.
    const anon = await supabase.auth.signInAnonymously();
    set({ ...deriveFromSession(anon.data.session), error: null });
  },
}));

/** API 클라이언트가 요청마다 호출: 현재 액세스 토큰(없으면 null). React 밖에서도 쓸 수 있게 getState() 사용. */
export function getAccessToken(): string | null {
  return useAuth.getState().accessToken;
}
