/**
 * "정보가 틀려요" 정정 요청 모달 (docs/02 M13). POST /contributions/corrections.
 * 사진 첨부는 후속 작업(멀티파트 업로드). 지금은 항목 선택 + 메모만 보냅니다.
 */
import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { postCorrection } from '@/data/api';
import type { CorrectionRequest } from '@/data/types';
import { colors, radius, spacing } from '@/ui/theme';

const FIELDS: { value: CorrectionRequest['field']; label: string }[] = [
  { value: 'origin', label: '원산지' },
  { value: 'ingredients', label: '성분' },
  { value: 'allergens', label: '알레르기' },
  { value: 'nutrition', label: '영양' },
  { value: 'name', label: '제품명·브랜드' },
  { value: 'other', label: '기타' },
];

export default function CorrectionScreen() {
  const router = useRouter();
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const [field, setField] = useState<CorrectionRequest['field']>('origin');
  const [memo, setMemo] = useState('');

  const mutation = useMutation({
    mutationFn: (body: CorrectionRequest) => postCorrection(body),
    onSuccess: () => router.back(),
  });

  const canSubmit = !!productId && memo.trim().length >= 5 && !mutation.isPending;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>어떤 정보가 틀렸나요?</Text>
      <View style={styles.chips}>
        {FIELDS.map((f) => {
          const on = field === f.value;
          return (
            <Pressable key={f.value} onPress={() => setField(f.value)} style={[styles.chip, on && styles.chipOn]}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>자세히 알려주세요</Text>
      <TextInput
        value={memo}
        onChangeText={setMemo}
        multiline
        placeholder="예) 라벨에는 고춧가루가 국산이라고 적혀 있어요"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
      <Text style={styles.hint}>사진 첨부는 곧 지원됩니다. 제보는 익명으로 처리되며 처리 결과는 앱에서 확인할 수 있어요.</Text>

      {mutation.isError ? <Text style={styles.error}>전송 실패: {mutation.error.message}</Text> : null}

      <Pressable
        disabled={!canSubmit}
        onPress={() => productId && mutation.mutate({ product_id: productId, field, memo: memo.trim() })}
        style={[styles.submit, !canSubmit && styles.submitDisabled]}
      >
        {mutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>보내기</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  label: { fontSize: 14, fontWeight: '700', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.xl, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.primary },
  chipText: { fontSize: 14, color: colors.text, fontWeight: '600' },
  chipTextOn: { color: '#fff' },
  input: {
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  hint: { fontSize: 12, color: colors.textMuted },
  error: { color: colors.danger },
  submit: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
