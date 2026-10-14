/**
 * 스캔 기록 탭. SQLite `scans` 테이블을 최신순으로 보여줍니다(비회원 50건).
 * 화면이 포커스될 때마다 다시 읽어 방금 스캔한 항목이 바로 보이게 합니다.
 */
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { listScans } from '@/data/cache';
import type { ScanRecord } from '@/data/types';
import { colors, spacing } from '@/ui/theme';

const METHOD_LABELS: Record<ScanRecord['method'], string> = {
  barcode: '바코드',
  image: '이미지',
  ocr: 'OCR',
  search: '검색',
};

function formatDate(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function HistoryScreen() {
  const router = useRouter();
  const query = useQuery({ queryKey: ['scans', 50], queryFn: () => listScans(50) });

  useFocusEffect(
    useCallback(() => {
      void query.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  return (
    <FlatList
      data={query.data ?? []}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      refreshing={query.isFetching}
      onRefresh={() => query.refetch()}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>아직 스캔 기록이 없어요</Text>
          <Text style={styles.emptySub}>스캔 탭에서 제품 바코드를 비춰보세요.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => item.product_id && router.push(`/product/${item.product_id}`)}
          disabled={!item.product_id}
          style={styles.row}
        >
          <View style={styles.rowText}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name ?? item.ean13 ?? '(이름 없음)'}
            </Text>
            <Text style={styles.meta}>
              {METHOD_LABELS[item.method]} · {item.ean13 ?? '-'} · {formatDate(item.created_at)}
            </Text>
          </View>
          {item.product_id ? <Text style={styles.chevron}>›</Text> : null}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, backgroundColor: colors.bg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowText: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 22, color: colors.textMuted },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  emptySub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
});
