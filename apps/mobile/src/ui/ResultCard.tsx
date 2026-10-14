/**
 * 결과 카드 (docs/02-product-spec.md §4). 스캔 화면 하단에 슬라이드 업 되는 "3초 요약".
 *
 * 위에서부터: 회수 배너(있을 때만) → 썸네일·제품명·브랜드 → ⚠ 내 프로필 → 원산지 → 성분 → 출처.
 * 카드를 탭하면 상세 화면(/product/[id])으로 이동합니다.
 *
 * 애니메이션은 Reanimated 의 `entering` 프리셋만 사용합니다(바텀시트 라이브러리 없이 단순하게).
 */
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Product, Source } from '@/data/types';
import { useProfile, profileHasSettings } from '@/data/profile';
import { allergenLabel, evaluateProduct, gradeSummary, originBadges } from '@/domain';

import { GradeChip } from './GradeChip';
import { OriginBadge } from './OriginBadge';
import { Section } from './Section';
import { colors, radius, spacing } from './theme';

const SOURCE_LABELS: Record<string, string> = {
  mfds_c002: '식약처 품목제조보고',
  mfds_i0490: '식약처 회수정보',
  impfood: '수입식품정보마루',
  koreannet: '코리안넷',
  ocr_user: '라벨 OCR',
  ocr_verified: '라벨 OCR',
  manufacturer: '제조사 정정',
  curator: '내부 검수',
};

function formatSource(s: Source): string {
  const label = SOURCE_LABELS[s.type] ?? s.type;
  const date = s.date ? s.date.slice(0, 7) : null; // YYYY-MM
  const meta = [date, s.confirmations ? `${s.confirmations}명 확인` : null].filter(Boolean).join(', ');
  return meta ? `${label}(${meta})` : label;
}

interface ResultCardProps {
  product: Product;
  /** 캐시에서 왔는지 등 작은 안내 */
  note?: string;
  onClose?: () => void;
}

export function ResultCard({ product, note, onClose }: ResultCardProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useProfile((s) => s.profile);

  const warnings = useMemo(() => evaluateProduct(product, profile), [product, profile]);
  const badges = useMemo(() => originBadges(product.origin), [product.origin]);
  const summary = useMemo(
    () => product.grade_summary ?? gradeSummary(product.ingredients),
    [product.grade_summary, product.ingredients],
  );

  const { product: info, recall, allergens, sources } = product;
  const showProfile = profileHasSettings(profile);
  const personal = warnings.warnings.filter((w) => w.kind !== 'recall');
  const mfg = badges.filter((b) => b.level !== 'ingredient');
  const ing = badges.filter((b) => b.level === 'ingredient');

  const goDetail = () => router.push(`/product/${info.id}`);
  const goCorrection = () => router.push(`/correction?productId=${encodeURIComponent(info.id)}`);

  return (
    <Animated.View
      entering={SlideInDown.duration(260)}
      exiting={SlideOutDown.duration(200)}
      style={[styles.card, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
    >
      <Pressable onPress={goDetail} accessibilityRole="button" accessibilityLabel={`${info.name} 상세 보기`}>
        {/* 회수·판매중지 배너 */}
        {recall ? (
          <View style={styles.recall}>
            <Text style={styles.recallText}>⚠ 회수·판매중지 — {recall.reason}</Text>
          </View>
        ) : null}

        {/* 헤더: 썸네일 + 제품명 + 브랜드/분류 */}
        <View style={styles.header}>
          {info.image_url ? (
            <Image source={{ uri: info.image_url }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty]}>
              <Text style={styles.thumbEmptyText}>{info.category === 'cosmetic' ? '🧴' : '🛒'}</Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={2}>
              {info.name}
            </Text>
            <Text style={styles.brand} numberOfLines={1}>
              {[info.brand ?? info.manufacturer, info.subcategory].filter(Boolean).join(' · ') || '브랜드 정보 없음'}
            </Text>
          </View>
          {onClose ? (
            <Pressable onPress={onClose} hitSlop={12} style={styles.close} accessibilityLabel="닫기">
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          ) : null}
        </View>

        {/* ⚠ 내 프로필 */}
        {showProfile ? (
          <Section title="⚠ 내 프로필">
            {personal.length === 0 ? (
              <Text style={styles.ok}>프로필과 겹치는 경고 없음</Text>
            ) : (
              personal.map((w, i) => (
                <Text
                  key={`${w.kind}-${i}`}
                  style={[
                    styles.warning,
                    w.severity === 'danger' && styles.warningDanger,
                    w.severity === 'info' && styles.warningInfo,
                  ]}
                >
                  • {w.message}
                  {w.note ? <Text style={styles.warningNote}> ({w.note})</Text> : null}
                </Text>
              ))
            )}
          </Section>
        ) : null}

        {/* 원산지 */}
        <Section title="원산지">
          {badges.length === 0 ? (
            <Text style={styles.muted}>원산지 정보 없음 · 뒷면 라벨을 비춰 등록할 수 있어요</Text>
          ) : (
            <>
              <View style={styles.badgeRow}>
                {mfg.map((b) => (
                  <OriginBadge key={b.level} badge={b} />
                ))}
              </View>
              {ing.length > 0 ? (
                <View style={[styles.badgeRow, { marginTop: spacing.sm }]}>
                  <Text style={styles.ingLabel}>원재료</Text>
                  <Text style={styles.ingText}>
                    {ing.map((b) => `${b.ingredientName} ${b.text}`).join(' · ')}
                    {product.origin?.undisclosed_note ? ` · ${product.origin.undisclosed_note}` : ''}
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </Section>

        {/* 성분 요약 + 알레르기 */}
        <Section title="성분">
          <View style={styles.chipRow}>
            <GradeChip grade={0} count={summary['0']} />
            <GradeChip grade={1} count={summary['1']} />
            <GradeChip grade={2} count={summary['2']} />
            <GradeChip grade={3} count={summary['3']} />
            {summary.unknown > 0 ? <GradeChip grade={null} count={summary.unknown} /> : null}
          </View>
          <Text style={styles.allergy}>
            <Text style={styles.allergyLabel}>알레르기: </Text>
            {allergens.contains.length > 0 ? allergens.contains.map(allergenLabel).join(', ') : '표시 없음'}
            {allergens.may_contain.length > 0 ? (
              <Text style={styles.muted}> ｜ 혼입 가능: {allergens.may_contain.map(allergenLabel).join(', ')}</Text>
            ) : null}
          </Text>
        </Section>

        {/* 출처 */}
        <Section
          right={
            <Pressable onPress={goCorrection} hitSlop={8} style={styles.correctBtn}>
              <Text style={styles.correctText}>정보가 틀려요</Text>
            </Pressable>
          }
        >
          <Text style={styles.source} numberOfLines={2}>
            출처: {sources.length > 0 ? sources.map(formatSource).join(' · ') : '정보 없음'}
          </Text>
          {note ? <Text style={styles.note}>{note}</Text> : null}
        </Section>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 12,
    overflow: 'hidden',
  },
  recall: { backgroundColor: colors.danger, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  recallText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  thumb: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.surface },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  thumbEmptyText: { fontSize: 24 },
  headerText: { flex: 1 },
  name: { fontSize: 17, fontWeight: '800', color: colors.text },
  brand: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  close: { padding: 4 },
  closeText: { fontSize: 16, color: colors.textMuted },
  ok: { fontSize: 14, color: colors.textMuted },
  warning: { fontSize: 14, color: colors.warning, fontWeight: '600', marginBottom: 2 },
  warningDanger: { color: colors.danger },
  warningInfo: { color: colors.textMuted, fontWeight: '500' },
  warningNote: { fontWeight: '400', color: colors.textMuted },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'flex-start' },
  ingLabel: { fontSize: 12, color: colors.textMuted, paddingTop: 2 },
  ingText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  allergy: { fontSize: 13, color: colors.text },
  allergyLabel: { color: colors.textMuted },
  muted: { fontSize: 13, color: colors.textMuted },
  source: { fontSize: 12, color: colors.textMuted, flex: 1 },
  note: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  correctBtn: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm, backgroundColor: colors.surface },
  correctText: { fontSize: 12, fontWeight: '600', color: colors.primary },
});
