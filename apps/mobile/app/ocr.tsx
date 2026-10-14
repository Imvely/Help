/**
 * 라벨 OCR 폴백 화면 (docs/02 M8, §7 데이터 기여 루프).
 *
 * 5단계를 한 화면에서 state machine 으로 처리합니다:
 *   capture(촬영) → processing(리사이즈·업로드·폴링) → edit(확인·수정) → submitting(제보) → /product/{id} 로 이동
 *
 * 진입 경로: 스캔 화면 404 CTA(`/ocr?ean13=…`) 또는 제품 상세의 "라벨 등록"(`/ocr?product_id=…`).
 * 데이터 로직은 src/data/ocr.ts, 폼은 src/ui/LabelEditor.tsx 에 있어 이 파일은 흐름 제어만 합니다.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PhotoFile } from 'react-native-vision-camera';

import { LabelCamera } from '@/camera/LabelCamera';
import { submitLabelContribution } from '@/data/api';
import { recordScan } from '@/data/cache';
import { prepareLabelPhoto, runLabelOcr, type PreparedPhoto } from '@/data/ocr';
import type { LabelContributionRequest, LabelExtraction } from '@/data/types';
import { productByBarcodeKey } from '@/data/useProduct';
import { LabelEditor, type NewProductFields } from '@/ui/LabelEditor';
import { colors, radius, spacing } from '@/ui/theme';

type Step = 'capture' | 'processing' | 'edit';

const STATUS_TEXT: Record<string, string> = {
  preparing: '사진을 준비하는 중…',
  uploading: '업로드 중…',
  queued: '인식 대기 중…',
  running: '라벨을 읽는 중…',
  done: '완료',
};

const SOURCE_NOTE = "제보해 주신 정보는 '사용자 제보(미검증)'으로 표시되며 3명 이상 일치하면 검증됨으로 바뀝니다.";

export default function OcrScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  // 스캔 화면은 `ean13`, 예전 링크는 `ean` 으로 넘길 수 있어 둘 다 받습니다.
  const params = useLocalSearchParams<{ ean13?: string; ean?: string; product_id?: string }>();
  const ean13 = params.ean13 ?? params.ean;
  const productId = params.product_id;

  const [step, setStep] = useState<Step>('capture');
  const [statusKey, setStatusKey] = useState('preparing');
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<LabelExtraction | null>(null);
  const [newProduct, setNewProduct] = useState<NewProductFields>({ product_name: '', brand: '', category: 'food' });

  // 화면을 떠나면 진행 중인 업로드/폴링을 취소합니다.
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const onPhoto = useCallback(
    async (raw: PhotoFile) => {
      setError(null);
      setStep('processing');
      setStatusKey('preparing');
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const prepared = await prepareLabelPhoto(raw.path, raw.width, raw.height);
        setPhoto(prepared);
        const result = await runLabelOcr(
          prepared,
          { ean13, product_id: productId },
          { signal: controller.signal, onStatus: (s) => setStatusKey(s) },
        );
        setJobId(result.jobId);
        setExtraction(result.extraction);
        setStep('edit');
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : '라벨을 읽지 못했어요');
        setStep('capture');
      }
    },
    [ean13, productId],
  );

  const submit = useMutation({
    mutationFn: (body: LabelContributionRequest) => submitLabelContribution(body),
    onSuccess: async (res) => {
      // 스캔 화면의 404 결과를 무효화해 돌아가면 새 제품이 보이게 하고, 상세 캐시도 갱신합니다.
      if (ean13) await queryClient.invalidateQueries({ queryKey: productByBarcodeKey(ean13) });
      await queryClient.invalidateQueries({ queryKey: ['product', res.product_id] });
      void recordScan({ ean13, productId: res.product_id, name: newProduct.product_name || null, method: 'ocr' });
      router.replace(`/product/${encodeURIComponent(res.product_id)}`);
    },
  });

  const needsProductFields = !productId;
  const canSubmit =
    !!extraction && !!jobId && !submit.isPending && (!needsProductFields || newProduct.product_name.trim().length > 0);

  const onSubmit = () => {
    if (!extraction || !jobId) return;
    const body: LabelContributionRequest = { job_id: jobId, extraction };
    if (ean13) body.ean13 = ean13;
    if (productId) body.product_id = productId;
    if (needsProductFields) {
      body.product_name = newProduct.product_name.trim();
      if (newProduct.brand.trim()) body.brand = newProduct.brand.trim();
      body.category = newProduct.category;
    }
    submit.mutate(body);
  };

  // --- 1단계: 촬영 ---------------------------------------------------------
  if (step === 'capture') {
    return (
      <View style={styles.dark}>
        <Stack.Screen options={{ title: '라벨 촬영' }} />
        <LabelCamera isActive onPhoto={onPhoto} />
        <View style={[styles.topNote, { top: insets.top + spacing.sm }]}>
          <Text style={styles.topNoteText}>
            {productId ? '이 제품의 뒷면 라벨을 찍어 주세요' : ean13 ? `바코드 ${ean13} · 뒷면 라벨을 찍어 주세요` : '뒷면 라벨을 찍어 주세요'}
          </Text>
          {error ? <Text style={styles.topError}>{error}</Text> : null}
        </View>
      </View>
    );
  }

  // --- 2~3단계: 업로드·인식 대기 -------------------------------------------
  if (step === 'processing') {
    return (
      <View style={[styles.dark, styles.center]}>
        <Stack.Screen options={{ title: '라벨 인식 중' }} />
        {photo ? <Image source={{ uri: photo.uri }} style={styles.preview} resizeMode="contain" /> : null}
        <ActivityIndicator color="#fff" size="large" style={{ marginTop: spacing.lg }} />
        <Text style={styles.processingText}>{STATUS_TEXT[statusKey] ?? statusKey}</Text>
        <Text style={styles.processingSub}>보통 10초 안에 끝나요. 최대 1분까지 기다립니다.</Text>
        <Pressable
          onPress={() => {
            abortRef.current?.abort();
            setStep('capture');
          }}
          style={styles.cancel}
        >
          <Text style={styles.cancelText}>취소하고 다시 찍기</Text>
        </Pressable>
      </View>
    );
  }

  // --- 4~5단계: 확인·수정 → 제보 -------------------------------------------
  return (
    <KeyboardAvoidingView style={styles.light} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: '읽은 내용 확인' }} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl * 4 }} keyboardShouldPersistTaps="handled">
        <View style={styles.previewRow}>
          {photo ? <Image source={{ uri: photo.uri }} style={styles.thumb} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.previewTitle}>서버가 읽은 내용이에요</Text>
            <Text style={styles.previewSub}>틀린 곳을 고치고 아래 ‘제보하기’를 눌러 주세요.</Text>
            <Pressable onPress={() => setStep('capture')} hitSlop={6}>
              <Text style={styles.link}>다시 찍기</Text>
            </Pressable>
          </View>
        </View>

        {extraction ? (
          <LabelEditor
            value={extraction}
            onChange={setExtraction}
            newProduct={needsProductFields ? newProduct : undefined}
            onChangeNewProduct={needsProductFields ? setNewProduct : undefined}
          />
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.note}>{SOURCE_NOTE}</Text>
          {submit.isError ? <Text style={styles.error}>제보 실패: {submit.error.message}</Text> : null}
          {needsProductFields && newProduct.product_name.trim().length === 0 ? (
            <Text style={styles.hint}>제품명을 입력하면 제보할 수 있어요.</Text>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.submitBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable disabled={!canSubmit} onPress={onSubmit} style={[styles.submit, !canSubmit && styles.submitDisabled]}>
          {submit.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>제보하기</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  dark: { flex: 1, backgroundColor: '#000' },
  light: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  topNote: { position: 'absolute', left: spacing.lg, right: spacing.lg, alignItems: 'center', gap: 6 },
  topNoteText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: colors.overlay,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    overflow: 'hidden',
  },
  topError: {
    color: '#fff',
    fontSize: 13,
    backgroundColor: colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    overflow: 'hidden',
  },
  preview: { width: '70%', aspectRatio: 0.75, borderRadius: radius.lg, backgroundColor: '#111' },
  processingText: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: spacing.md },
  processingSub: { color: '#9CA3AF', fontSize: 12, marginTop: 4 },
  cancel: { marginTop: spacing.xl, paddingVertical: 10, paddingHorizontal: spacing.lg },
  cancelText: { color: '#D1D5DB', fontWeight: '600' },
  previewRow: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, alignItems: 'center' },
  thumb: { width: 64, height: 84, borderRadius: radius.md, backgroundColor: colors.surface },
  previewTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  previewSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  link: { color: colors.primary, fontWeight: '700', fontSize: 13, marginTop: 6 },
  footer: { padding: spacing.lg, gap: spacing.sm },
  note: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  hint: { fontSize: 12, color: colors.warning },
  error: { color: colors.danger, fontSize: 13 },
  submitBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  submit: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
