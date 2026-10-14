/**
 * 라벨 촬영 카메라 (docs/02 M8 "뒷면을 비춰주세요").
 *
 * ScanCamera 와 달리 코드 스캐너가 없고 `photo` 모드로 고해상도 정지 사진을 찍습니다.
 * `camera.takePhoto()` 는 기기 임시 폴더에 JPEG 을 쓰고 경로·크기를 돌려줍니다 → src/data/ocr.ts 가 리사이즈 후 업로드.
 *
 * 가이드 박스는 세로로 긴 라벨(원재료명 표)을 가정한 비율입니다. 실제 크롭은 하지 않고 안내만 합니다
 * (서버 OCR 이 전체 사진에서 원재료명 영역을 찾는 편이 사용자가 정확히 맞추는 것보다 안정적).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, type PhotoFile } from 'react-native-vision-camera';

import { colors } from '@/ui/theme';

export interface LabelCameraProps {
  isActive: boolean;
  onPhoto: (photo: PhotoFile) => void;
  /** 촬영 중/처리 중에는 셔터를 잠급니다 */
  busy?: boolean;
}

export function LabelCamera({ isActive, onPhoto, busy = false }: LabelCameraProps) {
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const camera = useRef<Camera>(null);
  const [torch, setTorch] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPermission) void requestPermission();
  }, [hasPermission, requestPermission]);

  const capture = useCallback(async () => {
    if (!camera.current || capturing || busy) return;
    setCapturing(true);
    setError(null);
    try {
      const photo = await camera.current.takePhoto({
        flash: torch ? 'on' : 'off',
        enableShutterSound: false,
      });
      onPhoto(photo);
    } catch (err) {
      setError(err instanceof Error ? err.message : '촬영에 실패했어요');
    } finally {
      setCapturing(false);
    }
  }, [capturing, busy, torch, onPhoto]);

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>카메라 권한이 필요해요</Text>
        <Text style={styles.sub}>설정에서 어디산의 카메라 접근을 허용해 주세요.</Text>
      </View>
    );
  }
  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>카메라를 찾을 수 없어요</Text>
        <Text style={styles.sub}>시뮬레이터에서는 카메라가 동작하지 않습니다. 실기기를 사용해 주세요.</Text>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        photo
        photoQualityBalance="quality"
        torch={torch ? 'on' : 'off'}
        enableZoomGesture
        resizeMode="cover"
      />

      {/* 가이드 박스 */}
      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.guide}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
        </View>
        <Text style={styles.hint}>원재료명 영역을 네모 안에</Text>
        <Text style={styles.hintSub}>글자가 또렷하게 보이도록 가까이, 흔들리지 않게 찍어 주세요</Text>
      </View>

      {/* 하단 컨트롤: 플래시 · 셔터 */}
      <View style={styles.controls}>
        <Pressable onPress={() => setTorch((t) => !t)} style={styles.sideBtn} accessibilityLabel="플래시">
          <Text style={styles.sideIcon}>{torch ? '🔦' : '💡'}</Text>
        </Pressable>
        <Pressable
          onPress={capture}
          disabled={capturing || busy}
          style={[styles.shutter, (capturing || busy) && styles.shutterDisabled]}
          accessibilityRole="button"
          accessibilityLabel="촬영"
        >
          {capturing ? <ActivityIndicator color={colors.text} /> : <View style={styles.shutterInner} />}
        </Pressable>
        <View style={styles.sideBtn} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const CORNER = 26;
const STROKE = 3;

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', padding: 24 },
  message: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  sub: { color: '#D1D5DB', fontSize: 14, textAlign: 'center' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingBottom: 120 },
  guide: { width: '82%', aspectRatio: 0.9 },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#fff' },
  tl: { top: 0, left: 0, borderTopWidth: STROKE, borderLeftWidth: STROKE, borderTopLeftRadius: 8 },
  tr: { top: 0, right: 0, borderTopWidth: STROKE, borderRightWidth: STROKE, borderTopRightRadius: 8 },
  bl: { bottom: 0, left: 0, borderBottomWidth: STROKE, borderLeftWidth: STROKE, borderBottomLeftRadius: 8 },
  br: { bottom: 0, right: 0, borderBottomWidth: STROKE, borderRightWidth: STROKE, borderBottomRightRadius: 8 },
  hint: {
    marginTop: 18,
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    backgroundColor: colors.overlay,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    overflow: 'hidden',
  },
  hintSub: { marginTop: 6, color: '#D1D5DB', fontSize: 12, textAlign: 'center', paddingHorizontal: 32 },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  sideBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center' },
  sideIcon: { fontSize: 22 },
  shutter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: { opacity: 0.5 },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  error: { position: 'absolute', bottom: 124, alignSelf: 'center', color: '#FCA5A5', fontSize: 13 },
});
