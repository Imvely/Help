/**
 * 라벨 OCR 폴백 화면 (docs/02 M8). 지금은 자리만 잡은 플레이스홀더입니다.
 * 다음 단계: VisionCamera 로 고해상도 사진 촬영 → POST /ocr/label → /ocr/jobs/{id} 폴링 → 확인·수정 화면.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/ui/theme';

export default function OcrScreen() {
  const router = useRouter();
  const { ean } = useLocalSearchParams<{ ean?: string }>();

  return (
    <View style={styles.root}>
      <View style={styles.guide}>
        <Text style={styles.title}>뒷면을 비춰주세요</Text>
        <Text style={styles.sub}>원재료명 영역을 네모 안에 맞춰 주세요.{ean ? `\n바코드: ${ean}` : ''}</Text>
        <Text style={styles.todo}>(라벨 촬영·OCR 업로드는 다음 단계에서 구현됩니다)</Text>
      </View>
      <Pressable onPress={() => router.back()} style={styles.btn}>
        <Text style={styles.btnText}>돌아가기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  guide: {
    width: '100%',
    aspectRatio: 1.4,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: spacing.sm },
  sub: { color: '#D1D5DB', fontSize: 14, textAlign: 'center' },
  todo: { color: '#9CA3AF', fontSize: 12, marginTop: spacing.lg, textAlign: 'center' },
  btn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  btnText: { color: '#fff', fontWeight: '700' },
});
