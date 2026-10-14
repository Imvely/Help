/**
 * 제품 상세 화면. 파일명 `[id].tsx` 는 동적 경로(/product/123)이며 `useLocalSearchParams` 로 id 를 받습니다.
 * 탭: 원산지 / 성분 / 영양 / 대체 / 출처 (docs/02 §3, P1-2). 상단에는 결과 카드와 같은 "⚠ 내 프로필" 요약을 둡니다.
 */
import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getAlternatives, getProduct } from '@/data/api';
import { useProfile, profileHasSettings } from '@/data/profile';
import type { Alternative, Product } from '@/data/types';
import { allergenLabel, evaluateProduct, gradeSummary, originBadges } from '@/domain';
import { GradeChip } from '@/ui/GradeChip';
import { OriginBadge, ingredientOriginShort } from '@/ui/OriginBadge';
import { Section } from '@/ui/Section';
import { colors, evidenceIcons, gradeColors, gradeKey, radius, spacing } from '@/ui/theme';

type TabKey = 'origin' | 'ingredients' | 'nutrition' | 'alternatives' | 'sources';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'origin', label: '원산지' },
  { key: 'ingredients', label: '성분' },
  { key: 'nutrition', label: '영양' },
  { key: 'alternatives', label: '대체' },
  { key: 'sources', label: '출처' },
];

const SOURCE_LABELS: Record<string, string> = {
  mfds_c002: '식약처 품목제조보고',
  mfds_i0490: '식약처 회수정보',
  impfood: '수입식품정보마루',
  koreannet: '코리안넷',
  ocr_user: '사용자 라벨 OCR(미검증)',
  ocr_verified: '라벨 OCR(검증됨)',
  manufacturer: '제조사 정정',
  curator: '내부 검수',
};

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('origin');
  const profile = useProfile((s) => s.profile);

  const query = useQuery({
    queryKey: ['product', id],
    enabled: !!id,
    queryFn: ({ signal }) => getProduct(id, { signal }),
  });

  const data = query.data;
  const warnings = useMemo(() => (data ? evaluateProduct(data, profile) : null), [data, profile]);

  if (query.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (query.isError || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>제품 정보를 불러오지 못했어요</Text>
        <Text style={styles.muted}>{query.error?.message}</Text>
      </View>
    );
  }

  const info = data.product;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}>
      <Stack.Screen options={{ title: info.name }} />

      {data.recall ? (
        <View style={styles.recall}>
          <Text style={styles.recallText}>⚠ 회수·판매중지 — {data.recall.reason}</Text>
          {data.recall.issued_at ? <Text style={styles.recallSub}>{data.recall.issued_at}</Text> : null}
        </View>
      ) : null}

      <View style={styles.header}>
        {info.image_url ? <Image source={{ uri: info.image_url }} style={styles.thumb} /> : <View style={[styles.thumb, styles.thumbEmpty]} />}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{info.name}</Text>
          <Text style={styles.brand}>{[info.brand ?? info.manufacturer, info.subcategory].filter(Boolean).join(' · ')}</Text>
        </View>
      </View>

      {profileHasSettings(profile) && warnings ? (
        <Section title="⚠ 내 프로필">
          {warnings.warnings.filter((w) => w.kind !== 'recall').length === 0 ? (
            <Text style={styles.muted}>프로필과 겹치는 경고 없음</Text>
          ) : (
            warnings.warnings
              .filter((w) => w.kind !== 'recall')
              .map((w, i) => (
                <Text key={`${w.kind}-${i}`} style={[styles.warning, w.severity === 'danger' && { color: colors.danger }, w.severity === 'info' && styles.muted]}>
                  • {w.message}
                  {w.note ? ` (${w.note})` : ''}
                </Text>
              ))
          )}
        </Section>
      ) : null}

      {/* 탭 바 */}
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabOn]}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextOn]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'origin' ? (
        <OriginTab data={data} onRegisterLabel={() => router.push(`/ocr?product_id=${encodeURIComponent(info.id)}`)} />
      ) : null}
      {tab === 'ingredients' ? <IngredientsTab data={data} /> : null}
      {tab === 'nutrition' ? <NutritionTab data={data} /> : null}
      {tab === 'alternatives' ? (
        <AlternativesTab productId={info.id} onSelect={(id) => router.push(`/product/${encodeURIComponent(id)}`)} />
      ) : null}
      {tab === 'sources' ? (
        <SourcesTab data={data} onCorrection={() => router.push(`/correction?productId=${encodeURIComponent(info.id)}`)} />
      ) : null}
    </ScrollView>
  );
}

function OriginTab({ data, onRegisterLabel }: { data: Product; onRegisterLabel: () => void }) {
  // 면책 문구는 아래에서 직접 그리므로 배지에서는 뺍니다.
  const badges = originBadges(data.origin, { includeDisclaimer: false, category: data.product.category });
  const top = badges.filter((b) => b.level === 'manufacturing' || b.level === 'brand_owner');
  const ing = badges.filter((b) => b.level === 'ingredient');
  const undisclosed = badges.find((b) => b.level === 'undisclosed');
  return (
    <>
      <Section title="제조국 · 브랜드" noDivider>
        {top.length === 0 ? <Text style={styles.muted}>정보 없음</Text> : null}
        <View style={styles.badgeRow}>
          {top.map((b) => (
            <OriginBadge key={b.level} badge={b} />
          ))}
        </View>
        {data.origin?.oem ? <Text style={styles.muted}>OEM: 브랜드와 제조업자가 다릅니다.</Text> : null}
        {data.origin?.manufacturer_name ? <Text style={styles.muted}>제조업자: {data.origin.manufacturer_name}</Text> : null}
        {data.origin?.brand_owner_name ? <Text style={styles.muted}>책임판매업자: {data.origin.brand_owner_name}</Text> : null}
      </Section>
      <Section title="원재료 원산지 (상위 순위)">
        {ing.length === 0 ? (
          <>
            <Text style={styles.muted}>라벨 원산지 정보가 아직 없어요. 뒷면을 비춰 등록할 수 있습니다.</Text>
            <Pressable onPress={onRegisterLabel} style={styles.correctBtn}>
              <Text style={styles.correctText}>뒷면 라벨 촬영해 등록</Text>
            </Pressable>
          </>
        ) : null}
        {ing.map((b) => (
          <View key={`${b.ingredientName}-${b.rank}`} style={styles.ingRow}>
            <Text style={styles.ingName}>
              {b.rank ? `${b.rank}. ` : ''}
              {b.ingredientName}
            </Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.ingCountry}>{ingredientOriginShort(b).replace(`${b.ingredientName} `, '')}</Text>
              {b.basis ?? b.note ? <Text style={styles.muted}>{b.basis ?? b.note}</Text> : null}
            </View>
          </View>
        ))}
        {undisclosed ? <Text style={styles.muted}>{undisclosed.note ?? undisclosed.text}</Text> : null}
        {data.origin?.confidence ? (
          <Text style={styles.muted}>
            확신 수준: {data.origin.confidence === 'label_read' ? '라벨 확인' : data.origin.confidence === 'ocr' ? 'OCR' : '추정'}
          </Text>
        ) : null}
      </Section>
      {/* 법적 방어 문구 — 원산지 탭 하단 고정 (docs/02 §4) */}
      <Text style={styles.disclaimer}>원산지는 안전·품질을 뜻하지 않습니다.</Text>
    </>
  );
}

function IngredientsTab({ data }: { data: Product }) {
  const summary = data.grade_summary ?? gradeSummary(data.ingredients);
  return (
    <>
      <Section noDivider>
        <View style={styles.badgeRow}>
          <GradeChip grade={0} count={summary['0']} />
          <GradeChip grade={1} count={summary['1']} />
          <GradeChip grade={2} count={summary['2']} />
          <GradeChip grade={3} count={summary['3']} />
          {summary.unknown > 0 ? <GradeChip grade={null} count={summary.unknown} /> : null}
        </View>
        <Text style={[styles.muted, { marginTop: spacing.sm }]}>
          알레르기: {data.allergens.contains.map(allergenLabel).join(', ') || '표시 없음'}
          {data.allergens.may_contain.length > 0 ? ` ｜ 혼입 가능: ${data.allergens.may_contain.map(allergenLabel).join(', ')}` : ''}
        </Text>
      </Section>
      <Section title={`원재료 ${data.ingredients.length}개`}>
        {data.ingredients.map((ing, i) => {
          const key = gradeKey(ing.grade);
          return (
            <View key={`${ing.id ?? ing.name}-${i}`} style={styles.ingLine}>
              <View style={[styles.gradeBar, { backgroundColor: gradeColors[key] }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.ingName}>
                  {ing.name}
                  {ing.evidence ? <Text style={styles.muted}>  {evidenceIcons[ing.evidence]}</Text> : null}
                </Text>
                {ing.function ? <Text style={styles.muted}>{ing.function}</Text> : null}
                {ing.summary_ko ? <Text style={styles.summary}>{ing.summary_ko}</Text> : null}
              </View>
            </View>
          );
        })}
        <Text style={styles.disclaimer}>등급은 규제 결론·문헌 근거를 바탕으로 매겨지며 개인의 건강 상태를 대신 판단하지 않습니다.</Text>
      </Section>
    </>
  );
}

function NutritionTab({ data }: { data: Product }) {
  const n = data.nutrition;
  if (!n) {
    return (
      <Section noDivider>
        <Text style={styles.muted}>영양 정보가 없어요.</Text>
      </Section>
    );
  }
  const rows: [string, string | null][] = [
    ['1회 제공량', n.per_serving_g != null ? `${n.per_serving_g} g` : null],
    ['열량', n.kcal != null ? `${n.kcal} kcal` : null],
    ['나트륨', n.sodium_mg != null ? `${n.sodium_mg} mg (${Math.round((n.sodium_mg / 2000) * 100)}%)` : null],
    ['당류', n.sugar_g != null ? `${n.sugar_g} g` : null],
    ['포화지방', n.sat_fat_g != null ? `${n.sat_fat_g} g` : null],
    ['트랜스지방', n.trans_fat_g != null ? `${n.trans_fat_g} g` : null],
    ['단백질', n.protein_g != null ? `${n.protein_g} g` : null],
    ['카페인', n.caffeine_mg != null ? `${n.caffeine_mg} mg${n.caffeine_estimated ? ' (추정)' : ''}${n.high_caffeine ? ' · 고카페인' : ''}` : null],
  ];
  return (
    <Section noDivider>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.nutRow}>
          <Text style={styles.nutLabel}>{label}</Text>
          <Text style={[styles.nutValue, !value && styles.muted]}>{value ?? '-'}</Text>
        </View>
      ))}
      <Text style={styles.muted}>% 는 1일 기준치(나트륨 2,000mg) 대비입니다.</Text>
    </Section>
  );
}

/**
 * 대체 제품 (docs/02 P1-2): 같은 카테고리에서 "제조국 한국 + 등급 더 좋은" 제품 최대 3개.
 * 서버가 고르고 이유 한 줄(`reason`)을 함께 줍니다. 카드를 누르면 그 제품 상세로 이동합니다.
 */
function AlternativesTab({ productId, onSelect }: { productId: string; onSelect: (id: string) => void }) {
  const query = useQuery({
    queryKey: ['product', productId, 'alternatives'],
    queryFn: ({ signal }) => getAlternatives(productId, 3, { signal }),
  });

  if (query.isPending) {
    return (
      <Section noDivider>
        <ActivityIndicator />
      </Section>
    );
  }
  if (query.isError) {
    return (
      <Section noDivider>
        <Text style={styles.muted}>대체 제품을 불러오지 못했어요. {query.error.message}</Text>
      </Section>
    );
  }
  const items: Alternative[] = query.data.alternatives;
  return (
    <Section title="대체 제품" noDivider>
      {items.length === 0 ? <Text style={styles.muted}>비교할 제품이 아직 없어요</Text> : null}
      {items.map((alt) => {
        const g = alt.grade_summary;
        return (
          <Pressable key={alt.product.id} onPress={() => onSelect(alt.product.id)} style={styles.altCard}>
            {alt.product.image_url ? (
              <Image source={{ uri: alt.product.image_url }} style={styles.altThumb} />
            ) : (
              <View style={[styles.altThumb, styles.thumbEmpty]} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.ingName} numberOfLines={2}>
                {alt.product.name}
              </Text>
              <Text style={styles.muted}>
                {[alt.product.brand ?? alt.product.manufacturer, alt.manufacturing_country ? `제조국 ${alt.manufacturing_country}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <View style={[styles.badgeRow, { marginTop: 6 }]}>
                <GradeChip grade={0} count={g['0']} />
                <GradeChip grade={1} count={g['1']} />
                <GradeChip grade={2} count={g['2']} />
                <GradeChip grade={3} count={g['3']} />
              </View>
              <Text style={styles.altReason}>{alt.reason}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        );
      })}
      <Text style={styles.disclaimer}>추천은 제조국·성분 등급만 비교한 것이며 맛·가격·개인 건강 상태를 반영하지 않습니다.</Text>
    </Section>
  );
}

function SourcesTab({ data, onCorrection }: { data: Product; onCorrection: () => void }) {
  return (
    <>
      <Section title="이 정보는 어디서 왔나요?" noDivider>
        {data.sources.length === 0 ? <Text style={styles.muted}>출처 정보 없음</Text> : null}
        {data.sources.map((s, i) => (
          <View key={`${s.type}-${i}`} style={styles.nutRow}>
            <Text style={styles.nutLabel}>{SOURCE_LABELS[s.type] ?? s.type}</Text>
            <Text style={styles.nutValue}>
              {s.date ?? ''}
              {s.confirmations ? ` · ${s.confirmations}명 확인` : ''}
            </Text>
          </View>
        ))}
        {data.generated_at ? <Text style={styles.muted}>생성 시각: {data.generated_at}</Text> : null}
      </Section>
      <Section title="정정 요청">
        <Text style={styles.muted}>틀린 정보가 있다면 알려주세요. 3명 이상 같은 제보가 모이면 검증 표시가 붙습니다.</Text>
        <Pressable onPress={onCorrection} style={styles.correctBtn}>
          <Text style={styles.correctText}>정보가 틀려요</Text>
        </Pressable>
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  error: { fontSize: 16, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  recall: { backgroundColor: colors.danger, padding: spacing.md },
  recallText: { color: '#fff', fontWeight: '800' },
  recallSub: { color: '#FECACA', fontSize: 12, marginTop: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  thumb: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.surface },
  thumbEmpty: {},
  name: { fontSize: 20, fontWeight: '800', color: colors.text },
  brand: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  warning: { fontSize: 14, color: colors.warning, fontWeight: '600', marginBottom: 2 },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, marginTop: spacing.sm },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  tabTextOn: { color: colors.primary },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  ingRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  ingName: { fontSize: 15, color: colors.text, fontWeight: '600' },
  ingCountry: { fontSize: 14, color: colors.text },
  ingLine: { flexDirection: 'row', gap: spacing.md, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  gradeBar: { width: 4, borderRadius: 2 },
  summary: { fontSize: 13, color: colors.text, marginTop: 4, lineHeight: 19 },
  nutRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  nutLabel: { fontSize: 14, color: colors.textMuted },
  nutValue: { fontSize: 14, color: colors.text, fontWeight: '600' },
  disclaimer: { fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.lg },
  correctBtn: { marginTop: spacing.md, alignSelf: 'flex-start', backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radius.md },
  correctText: { color: colors.primary, fontWeight: '700' },
  altCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  altThumb: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.surface },
  altReason: { fontSize: 12, color: colors.text, marginTop: 4 },
  chevron: { fontSize: 22, color: colors.textMuted },
});
