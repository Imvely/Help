/**
 * 성분 등급 칩. "● 안전 12" 처럼 색 점 + 라벨 + 개수. 등급 옆에는 근거 수준 아이콘을 붙일 수 있습니다.
 */
import { StyleSheet, Text, View } from 'react-native';

import type { EvidenceLevel, Grade } from '@/data/types';

import { colors, evidenceIcons, gradeColors, gradeKey, gradeLabels, radius, spacing } from './theme';

interface GradeChipProps {
  grade: Grade | null | undefined;
  /** 요약 칩일 때 개수 */
  count?: number;
  /** 성분 한 줄에 붙일 때 근거 수준 */
  evidence?: EvidenceLevel | null;
  /** 라벨 대신 성분명을 보여줄 때 */
  label?: string;
  size?: 'sm' | 'md';
}

export function GradeChip({ grade, count, evidence, label, size = 'sm' }: GradeChipProps) {
  const key = gradeKey(grade);
  const color = gradeColors[key];
  const text = label ?? gradeLabels[key];
  const dim = count === 0;
  return (
    <View style={[styles.chip, size === 'md' && styles.chipMd, dim && styles.dim]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, size === 'md' && styles.textMd]}>
        {text}
        {count !== undefined ? ` ${count}` : ''}
      </Text>
      {evidence ? <Text style={styles.evidence}>{evidenceIcons[evidence] ?? ''}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    gap: 5,
  },
  chipMd: { paddingHorizontal: spacing.md, paddingVertical: 6 },
  dim: { opacity: 0.45 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 12, fontWeight: '600', color: colors.text },
  textMd: { fontSize: 14 },
  evidence: { fontSize: 11 },
});
