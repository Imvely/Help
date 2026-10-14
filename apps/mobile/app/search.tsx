/**
 * 텍스트 검색 화면 (docs/02 M9). 입력을 300ms 디바운스한 뒤 GET /products/search?q= 호출.
 */
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { searchProducts } from '@/data/api';
import { recordScan } from '@/data/cache';
import { colors, radius, spacing } from '@/ui/theme';

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function SearchScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  const q = useDebounced(text.trim(), 300);

  const query = useQuery({
    queryKey: ['search', q],
    enabled: q.length >= 2,
    queryFn: ({ signal }) => searchProducts(q, { signal }),
    staleTime: 60 * 1000,
  });

  return (
    <View style={styles.root}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="제품명 또는 브랜드 검색"
        placeholderTextColor={colors.textMuted}
        autoFocus
        returnKeyType="search"
        clearButtonMode="while-editing"
        style={styles.input}
      />
      {query.isFetching ? <ActivityIndicator style={{ marginTop: spacing.md }} /> : null}
      {query.isError ? <Text style={styles.error}>검색에 실패했어요: {query.error.message}</Text> : null}
      <FlatList
        data={query.data?.hits ?? []}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          q.length >= 2 && query.isSuccess ? <Text style={styles.empty}>검색 결과가 없어요</Text> : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              void recordScan({ ean13: item.ean13 ?? null, productId: item.id, name: item.name, method: 'search' });
              router.push(`/product/${item.id}`);
            }}
            style={styles.row}
          >
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {[item.brand, item.ean13].filter(Boolean).join(' · ')}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  input: {
    margin: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    fontSize: 16,
    color: colors.text,
  },
  row: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
  error: { color: colors.danger, paddingHorizontal: spacing.lg },
});
