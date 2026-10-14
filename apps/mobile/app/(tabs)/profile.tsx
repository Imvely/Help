/**
 * 건강 프로필 탭 (docs/02 §5). 모든 값은 기기의 SecureStore 에만 저장됩니다.
 * 알레르기 19항목 체크 · 심한 알레르기 토글 · 카페인 민감도 · 임신/수유 · 당뇨 · 고혈압 · 신장질환.
 */
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { useProfile } from '@/data/profile';
import type { CaffeineSensitivity } from '@/data/types';
import { caffeineLimitMg } from '@/domain';
import { Section } from '@/ui/Section';
import { colors, radius, spacing } from '@/ui/theme';

/** 한국 식약처 의무 표시 알레르기 19항목 (코드는 @eodisan/domain 과 동일) */
const ALLERGENS_19: { code: string; label: string }[] = [
  { code: 'egg', label: '알류' },
  { code: 'milk', label: '우유' },
  { code: 'buckwheat', label: '메밀' },
  { code: 'peanut', label: '땅콩' },
  { code: 'soy', label: '대두' },
  { code: 'wheat', label: '밀' },
  { code: 'mackerel', label: '고등어' },
  { code: 'crab', label: '게' },
  { code: 'shrimp', label: '새우' },
  { code: 'pork', label: '돼지고기' },
  { code: 'peach', label: '복숭아' },
  { code: 'tomato', label: '토마토' },
  { code: 'sulfite', label: '아황산류' },
  { code: 'walnut', label: '호두' },
  { code: 'chicken', label: '닭고기' },
  { code: 'beef', label: '쇠고기' },
  { code: 'squid', label: '오징어' },
  { code: 'shellfish', label: '조개류' },
  { code: 'pine_nut', label: '잣' },
];

const CAFFEINE_OPTIONS: { value: CaffeineSensitivity; label: string }[] = [
  { value: 'normal', label: '보통' },
  { value: 'sensitive', label: '민감' },
  { value: 'avoid', label: '피함' },
];

function ToggleRow({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
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
          {ALLERGENS_19.map((a) => {
            const on = profile.allergens.includes(a.code);
            return (
              <Pressable key={a.code} onPress={() => toggleAllergen(a.code)} style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{a.label}</Text>
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

      <Section title="데이터">
        <Pressable onPress={() => reset()} style={styles.resetBtn}>
          <Text style={styles.resetText}>프로필 초기화</Text>
        </Pressable>
      </Section>
    </ScrollView>
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
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  segment: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: 3 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm },
  segmentItemOn: { backgroundColor: '#fff', shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 },
  segmentText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  segmentTextOn: { color: colors.text },
  resetBtn: { paddingVertical: 10 },
  resetText: { color: colors.danger, fontWeight: '600' },
});
