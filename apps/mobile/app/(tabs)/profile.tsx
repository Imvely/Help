/**
 * 건강 프로필 탭 (docs/02 §5, §6). 모든 값은 기기의 SecureStore 에만 저장됩니다.
 * 알레르기 19항목 체크 · 심한 알레르기 토글 · 카페인 민감도 · 임신/수유 · 당뇨 · 고혈압 · 신장질환.
 *
 * 아래쪽에 회원 기능(M11/M12/P1-4)이 붙습니다:
 *   계정: 카카오 / Google / Apple(iOS) 로그인 — App Store 4.8 에 따라 동등하게 노출
 *   동기화: 민감정보 별도 동의 토글 → 동의 + 로그인 상태에서만 서버에 암호화 저장
 *   알림: "회수 알림 받기" → Expo 푸시 토큰 등록
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { mockAuthAvailable, useAuth } from '@/data/auth';
import { useProfile } from '@/data/profile';
import { disableRecallPush, enableRecallPush } from '@/data/push';
import { useSettings } from '@/data/settings';
import { mergeProfileOnLogin, pushProfile, pushScans } from '@/data/sync';
import type { CaffeineSensitivity } from '@/data/types';
import { allergenLabel, caffeineLimitMg, KR_MANDATORY_ALLERGENS } from '@/domain';
import { Section } from '@/ui/Section';
import { colors, radius, spacing } from '@/ui/theme';

const CAFFEINE_OPTIONS: { value: CaffeineSensitivity; label: string }[] = [
  { value: 'normal', label: '보통' },
  { value: 'sensitive', label: '민감' },
  { value: 'avoid', label: '피함' },
];

const SENSITIVE_CONSENT_TEXT =
  '알레르기·임신·질환 정보는 민감정보입니다. 동의 시 암호화되어 서버에 저장되며 기기 간 동기화에만 사용됩니다.';

function ToggleRow({ label, value, onChange, hint, disabled }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string; disabled?: boolean }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.toggleLabel, disabled && styles.disabledText]}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} disabled={disabled} />
    </View>
  );
}

function formatTime(ms: number | null): string {
  if (!ms) return '아직 없음';
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ProfileScreen() {
  const { profile, loaded, update, toggleAllergen, reset } = useProfile();
  const limit = caffeineLimitMg(profile);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}>
      <Text style={styles.notice}>프로필은 이 기기에만 저장되며 서버로 전송되지 않습니다. 판정은 기기에서 이루어집니다.</Text>
      {!loaded ? <Text style={styles.hint}>불러오는 중…</Text> : null}

      <Section title="식품 알레르기" noDivider>
        <View style={styles.chips}>
          {KR_MANDATORY_ALLERGENS.map((code) => {
            const on = profile.allergens.includes(code);
            return (
              <Pressable key={code} onPress={() => toggleAllergen(code)} style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{allergenLabel(code)}</Text>
              </Pressable>
            );
          })}
        </View>
        <ToggleRow
          label="심한 알레르기"
          hint="'혼입 가능' 문구도 경고로 표시"
          value={profile.severeAllergy}
          onChange={(v) => update({ severeAllergy: v })}
        />
      </Section>

      <Section title="카페인">
        <View style={styles.segment}>
          {CAFFEINE_OPTIONS.map((o) => {
            const on = profile.caffeineSensitivity === o.value;
            return (
              <Pressable
                key={o.value}
                onPress={() => update({ caffeineSensitivity: o.value })}
                style={[styles.segmentItem, on && styles.segmentItemOn]}
              >
                <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>1일 한도 자동 계산: {limit}mg</Text>
      </Section>

      <Section title="건강 상태">
        <ToggleRow label="임신 중" value={profile.pregnant} onChange={(v) => update({ pregnant: v })} />
        <ToggleRow label="수유 중" value={profile.nursing} onChange={(v) => update({ nursing: v })} />
        <ToggleRow label="당뇨" hint="당류·대체 감미료 안내" value={profile.diabetes} onChange={(v) => update({ diabetes: v })} />
        <ToggleRow label="고혈압" hint="나트륨 1일 기준치 % 표시" value={profile.hypertension} onChange={(v) => update({ hypertension: v })} />
        <ToggleRow label="신장질환" hint="인산염 첨가물명 안내(함량 없음)" value={profile.kidney} onChange={(v) => update({ kidney: v })} />
      </Section>

      <AccountSection />
      <SyncSection />
      <PushSection />

      <Section title="데이터">
        <Pressable onPress={() => reset()} style={styles.resetBtn}>
          <Text style={styles.resetText}>프로필 초기화</Text>
        </Pressable>
      </Section>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// 계정 (M11)
// ---------------------------------------------------------------------------

function AccountSection() {
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  const [mockName, setMockName] = useState('');

  if (!auth.available) {
    return (
      <Section title="계정">
        <Text style={styles.hint}>로그인은 준비 중입니다(서버 설정 필요)</Text>
      </Section>
    );
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  if (auth.isMember) {
    const provider = auth.user?.app_metadata?.provider as string | undefined;
    const label = auth.user?.email ?? auth.user?.user_metadata?.name ?? auth.user?.id?.slice(0, 8);
    return (
      <Section title="계정">
        <Text style={styles.value}>{label}</Text>
        <Text style={styles.hint}>{auth.isMock ? '목업 로그인(개발용)' : provider ? `${provider} 로그인` : '로그인됨'} · 히스토리는 기기 간에 동기화됩니다</Text>
        <Pressable onPress={() => run(auth.signOut)} style={styles.resetBtn} disabled={busy}>
          <Text style={styles.resetText}>로그아웃</Text>
        </Pressable>
      </Section>
    );
  }

  return (
    <Section title="계정">
      <Text style={styles.hint}>로그인하면 스캔 기록이 무제한 저장되고 기기 간에 동기화돼요. 로그인 없이도 모든 기능을 쓸 수 있어요.</Text>
      {auth.status === 'loading' ? <ActivityIndicator style={{ marginVertical: spacing.sm }} /> : null}
      {mockAuthAvailable ? (
        // 개발 전용: 소셜 로그인 연동 전까지 서버의 목업 토큰으로 회원 기능을 테스트한다 (EXPO_PUBLIC_AUTH_MOCK=1)
        <View style={styles.mockBox}>
          <Text style={styles.hint}>개발용 목업 로그인 — 이름만 입력하면 됩니다(같은 이름 = 같은 계정)</Text>
          <TextInput
            value={mockName}
            onChangeText={setMockName}
            placeholder="이름 (예: 다영)"
            style={styles.mockInput}
            autoCapitalize="none"
          />
          <Pressable
            onPress={() => run(() => auth.signInMock(mockName.trim() || '테스터'))}
            disabled={busy}
            style={[styles.loginBtn, styles.mockBtn]}
          >
            <Text style={[styles.loginText, { color: '#fff' }]}>목업 로그인</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.loginButtons}>
        <Pressable onPress={() => run(() => auth.signInWithOAuth('kakao'))} disabled={busy} style={[styles.loginBtn, styles.kakao]}>
          <Text style={[styles.loginText, { color: '#191919' }]}>카카오로 계속하기</Text>
        </Pressable>
        <Pressable onPress={() => run(() => auth.signInWithOAuth('google'))} disabled={busy} style={[styles.loginBtn, styles.google]}>
          <Text style={[styles.loginText, { color: colors.text }]}>Google로 계속하기</Text>
        </Pressable>
        {Platform.OS === 'ios' ? (
          // Apple 심사 4.8: 다른 소셜 로그인과 동등한 크기·위치. 버튼 스타일은 Apple 공식 컴포넌트만 허용됩니다.
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={radius.md}
            style={styles.appleBtn}
            onPress={() => run(auth.signInWithApple)}
          />
        ) : null}
      </View>
      {auth.error ? <Text style={styles.error}>{auth.error}</Text> : null}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// 동기화 (M12 opt-in)
// ---------------------------------------------------------------------------

function SyncSection() {
  const auth = useAuth();
  const settings = useSettings();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onConsent = async (v: boolean) => {
    setMessage(null);
    await settings.update({ syncConsent: v });
    if (v && auth.isMember) {
      setBusy(true);
      const r = await mergeProfileOnLogin();
      setBusy(false);
      setMessage(r.ok ? (r.pulled ? '서버의 프로필을 가져왔어요' : '프로필을 서버에 저장했어요') : `동기화 실패: ${r.error}`);
    }
  };

  const syncNow = async () => {
    setBusy(true);
    setMessage(null);
    const [p, s] = await Promise.all([pushProfile(), pushScans()]);
    setBusy(false);
    const parts = [
      p.ok ? '프로필 저장됨' : `프로필: ${p.error}`,
      s.ok ? `기록 ${s.uploaded}건 업로드` : `기록: ${s.error}`,
    ];
    setMessage(parts.join(' · '));
  };

  return (
    <Section title="동기화">
      <ToggleRow
        label="민감정보 동기화 동의"
        hint={SENSITIVE_CONSENT_TEXT}
        value={settings.syncConsent}
        onChange={onConsent}
        disabled={!auth.available}
      />
      {!auth.isMember ? (
        <Text style={styles.hint}>{auth.available ? '로그인하면 동기화가 시작돼요. 동의 전까지는 아무 것도 전송되지 않습니다.' : '서버 설정 후 사용할 수 있어요.'}</Text>
      ) : (
        <>
          <Text style={styles.hint}>
            프로필 마지막 동기화: {formatTime(settings.lastProfileSyncAt)} · 기록: {formatTime(settings.lastScanSyncAt)}
          </Text>
          <Pressable onPress={syncNow} disabled={busy || !settings.syncConsent} style={[styles.smallBtn, (busy || !settings.syncConsent) && styles.disabledBtn]}>
            {busy ? <ActivityIndicator /> : <Text style={styles.smallBtnText}>지금 동기화</Text>}
          </Pressable>
        </>
      )}
      {message ? <Text style={styles.hint}>{message}</Text> : null}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// 회수 푸시 (P1-4)
// ---------------------------------------------------------------------------

function PushSection() {
  const settings = useSettings();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onToggle = async (v: boolean) => {
    setBusy(true);
    setMessage(null);
    const r = v ? await enableRecallPush() : await disableRecallPush();
    setBusy(false);
    if (!r.ok) setMessage(r.error ?? '설정에 실패했어요');
  };

  return (
    <Section title="알림">
      <ToggleRow
        label="회수 알림 받기"
        hint="내가 스캔한 제품이 회수·판매중지되면 알려드려요"
        value={settings.pushEnabled}
        onChange={onToggle}
        disabled={busy}
      />
      {settings.pushEnabled && settings.pushRegisteredAt ? (
        <Text style={styles.hint}>등록됨 · {formatTime(settings.pushRegisteredAt)}</Text>
      ) : null}
      {message ? <Text style={styles.error}>{message}</Text> : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  notice: { fontSize: 12, color: colors.textMuted, padding: spacing.lg, paddingBottom: 0, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.xl, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.primary },
  chipText: { fontSize: 14, color: colors.text, fontWeight: '600' },
  chipTextOn: { color: '#fff' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.md },
  toggleLabel: { fontSize: 15, color: colors.text, fontWeight: '600' },
  disabledText: { color: colors.textMuted },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 17 },
  value: { fontSize: 15, color: colors.text, fontWeight: '700' },
  error: { fontSize: 12, color: colors.danger, marginTop: 4 },
  segment: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: 3 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm },
  segmentItemOn: { backgroundColor: '#fff', shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 },
  segmentText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  segmentTextOn: { color: colors.text },
  resetBtn: { paddingVertical: 10 },
  resetText: { color: colors.danger, fontWeight: '600' },
  loginButtons: { gap: spacing.sm, marginTop: spacing.sm },
  mockBox: { gap: spacing.sm, marginTop: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border },
  mockInput: { height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, color: colors.text },
  mockBtn: { backgroundColor: '#6B7280' },
  loginBtn: { height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  kakao: { backgroundColor: '#FEE500' },
  google: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  appleBtn: { height: 48, width: '100%' },
  loginText: { fontSize: 15, fontWeight: '700' },
  smallBtn: { alignSelf: 'flex-start', marginTop: spacing.sm, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radius.md },
  smallBtnText: { color: colors.primary, fontWeight: '700' },
  disabledBtn: { opacity: 0.4 },
});
