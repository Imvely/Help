/**
 * 결과 카드·상세 화면에서 쓰는 "제목 + 내용" 묶음. 구분선으로 섹션을 나눕니다.
 */
import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from './theme';

interface SectionProps {
  title?: string;
  /** 제목 오른쪽에 붙는 작은 요소(버튼 등) */
  right?: React.ReactNode;
  /** 위쪽 구분선 생략 */
  noDivider?: boolean;
}

export function Section({ title, right, noDivider, children }: PropsWithChildren<SectionProps>) {
  return (
    <View style={[styles.section, !noDivider && styles.divider]}>
      {(title || right) && (
        <View style={styles.header}>
          {title ? <Text style={styles.title}>{title}</Text> : <View />}
          {right}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
});
