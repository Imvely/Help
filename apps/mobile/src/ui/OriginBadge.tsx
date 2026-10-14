/**
 * 원산지 배지: "제조국 🇰🇷 한국" 처럼 반드시 레벨(제조국/브랜드/원재료명)을 붙입니다.
 * 색상은 어느 국가든 동일합니다 (특정 국가만 빨간색 등 금지 — docs/02 §4).
 */
import { StyleSheet, Text, View } from 'react-native';

import type { OriginBadge as OriginBadgeModel } from '@/domain';

import { colors, radius, spacing } from './theme';

interface OriginBadgeProps {
  badge: OriginBadgeModel;
}

export function OriginBadge({ badge }: OriginBadgeProps) {
  const unknown = !badge.country || badge.country === 'unknown';
  return (
    <View style={[styles.badge, unknown && styles.badgeUnknown]}>
      <Text style={styles.label}>{badge.label}</Text>
      <Text style={[styles.value, unknown && styles.valueUnknown]}>{badge.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
  },
  badgeUnknown: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: 'transparent' },
  label: { fontSize: 12, color: colors.textMuted },
  value: { fontSize: 13, fontWeight: '600', color: colors.text },
  valueUnknown: { color: colors.textMuted, fontWeight: '500' },
});
