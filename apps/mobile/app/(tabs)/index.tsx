/**
 * 스캔 화면(홈). 전체 화면 카메라 + 하단 결과 카드 (docs/02 §1 Happy path).
 *
 * 흐름: ScanCamera 가 EAN-13 을 확정 → useProduct(ean) 가 캐시/서버 조회 →
 *   성공: ResultCard 슬라이드 업 / 404: "찾을 수 없어요 → OCR 등록" CTA / 실패: 재시도 안내
 * 카드가 떠 있는 동안에는 재스캔을 멈추고, 닫으면 다시 스캔합니다.
 */
import { Link, useIsFocused, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScanCamera } from '@/camera/ScanCamera';
import { isNotFoundError } from '@/data/api';
import { useProduct } from '@/data/useProduct';
import { ResultCard } from '@/ui/ResultCard';
import { colors, radius, spacing } from '@/ui/theme';

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused(); // 다른 탭으로 가면 카메라를 끕니다(배터리)
  const [torch, setTorch] = useState(false);
  const [ean, setEan] = useState<string | null>(null);

  const query = useProduct(ean);
  const notFound = query.isError && isNotFoundError(query.error);
  const showingResult = !!ean && (query.isSuccess || query.isError);

  const onBarcode = useCallback((code: string) => setEan(code), []);
  const reset = useCallback(() => setEan(null), []);

  const fromNote =
    query.data?.from === 'cache'
      ? '로컬 캐시에서 불러옴'
      : query.data?.from === 'stale-cache'
        ? '네트워크 오류 — 저장된 정보를 보여줍니다'
        : undefined;

  return (
    <View style={styles.root}>
      <ScanCamera isActive={isFocused} torch={torch} paused={!!ean} onBarcode={onBarcode} />

      {/* 우상단 플래시 / 검색 */}
      <View style={[styles.topBar, { top: insets.top + spacing.sm }]}>
        <Pressable
          onPress={() => setTorch((t) => !t)}
          style={[styles.iconBtn, torch && styles.iconBtnOn]}
          accessibilityLabel="플래시"
        >
          <Text style={styles.icon}>{torch ? '🔦' : '💡'}</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/search')} style={styles.iconBtn} accessibilityLabel="검색">
          <Text style={styles.icon}>🔍</Text>
        </Pressable>
      </View>

      {/* 로딩 */}
      {ean && query.isPending ? (
        <View style={[styles.toast, { bottom: insets.bottom + 24 }]}>
          <ActivityIndicator color="#fff" />
          <Text style={styles.toastText}>{ean} 조회 중…</Text>
        </View>
      ) : null}

      {/* 결과 카드 */}
      {ean && query.isSuccess ? <ResultCard product={query.data.product} note={fromNote} onClose={reset} /> : null}

      {/* 404: DB 에 없음 → OCR 폴백 */}
      {ean && notFound ? (
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Text style={styles.sheetTitle}>찾을 수 없어요</Text>
          <Text style={styles.sheetSub}>바코드 {ean} 은(는) 아직 등록되지 않았어요.</Text>
          <Link href={`/ocr?ean=${ean}`} asChild>
            <Pressable style={styles.cta}>
              <Text style={styles.ctaText}>뒷면을 비춰 OCR로 등록하기</Text>
            </Pressable>
          </Link>
          <Pressable onPress={reset} style={styles.secondary}>
            <Text style={styles.secondaryText}>다시 스캔</Text>
          </Pressable>
        </View>
      ) : null}

      {/* 기타 오류 */}
      {ean && query.isError && !notFound ? (
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Text style={styles.sheetTitle}>불러오지 못했어요</Text>
          <Text style={styles.sheetSub}>{query.error.message}</Text>
          <Pressable onPress={() => query.refetch()} style={styles.cta}>
            <Text style={styles.ctaText}>다시 시도</Text>
          </Pressable>
          <Pressable onPress={reset} style={styles.secondary}>
            <Text style={styles.secondaryText}>다시 스캔</Text>
          </Pressable>
        </View>
      ) : null}

      {/* 카드 밖(카메라 영역) 탭 → 닫기 */}
      {showingResult ? <Pressable onPress={reset} style={styles.dismissArea} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  topBar: { position: 'absolute', right: spacing.lg, flexDirection: 'row', gap: spacing.sm },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnOn: { backgroundColor: 'rgba(255,255,255,0.85)' },
  icon: { fontSize: 20 },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
  },
  toastText: { color: '#fff', fontWeight: '600' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  sheetSub: { fontSize: 14, color: colors.textMuted },
  cta: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondary: { paddingVertical: 10, alignItems: 'center' },
  secondaryText: { color: colors.textMuted, fontWeight: '600' },
  dismissArea: { position: 'absolute', top: 0, left: 0, right: 0, height: '35%' },
});
