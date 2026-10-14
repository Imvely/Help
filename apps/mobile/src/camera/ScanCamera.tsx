/**
 * 바코드 스캔 카메라 (docs/03-architecture.md §3 "바코드 검출 — 2프레임 연속 동일").
 *
 * react-native-vision-camera 의 내장 코드 스캐너(ML Kit / AVFoundation)를 씁니다.
 * 프레임 프로세서(worklet)보다 설정이 단순하고, 바코드만 필요한 MVP 에는 이 경로가 가장 안정적입니다.
 * 나중에 블러 게이트·임베딩(docs/03 §3-1)을 붙일 때 `useFrameProcessor` 로 확장하면 됩니다.
 *
 * 디바운스 규칙: 같은 코드가 500ms 안에 2번 연속 들어와야 `onBarcode` 를 호출합니다(오인식 방지).
 * 정규화: UPC-A(12자리) 는 앞에 0 을 붙여 EAN-13 으로 만듭니다. (한국 바코드는 880 으로 시작하는 EAN-13)
 */
import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner, type Code } from 'react-native-vision-camera';

import { colors } from '@/ui/theme';

export interface ScanCameraProps {
  /** false 면 카메라 스트림을 멈춥니다(결과 카드가 떠 있을 때 등) */
  isActive: boolean;
  /** 플래시(토치) */
  torch?: boolean;
  /** 스캔 콜백 자체를 잠시 막고 싶을 때(카드 표시 중 재스캔 방지) */
  paused?: boolean;
  onBarcode: (ean13: string) => void;
  /** 같은 코드를 다시 발사하기까지의 최소 간격(ms) */
  cooldownMs?: number;
}

const CONFIRM_WINDOW_MS = 500;
const CONFIRM_COUNT = 2;

/** 바코드 문자열을 EAN-13 형태로 정규화. 숫자가 아니거나 길이가 맞지 않으면 null. */
export function normalizeBarcode(code: Code): string | null {
  const raw = (code.value ?? '').trim();
  if (!/^\d+$/.test(raw)) return null;
  switch (code.type) {
    case 'upc-a':
      return raw.length === 12 ? `0${raw}` : raw.length === 13 ? raw : null;
    case 'ean-13':
      return raw.length === 13 ? raw : null;
    case 'ean-8':
      // EAN-8 은 그대로 보냅니다(서버가 8자리도 받음). 13자리로 확장하지 않습니다.
      return raw.length === 8 ? raw : null;
    case 'qr':
      // QR 에 EAN-13 숫자만 들어있는 경우만 허용
      return raw.length === 13 ? raw : null;
    default:
      return raw.length === 13 ? raw : raw.length === 12 ? `0${raw}` : null;
  }
}

export function ScanCamera({ isActive, torch = false, paused = false, onBarcode, cooldownMs = 2500 }: ScanCameraProps) {
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  // 디바운스 상태는 렌더와 무관하므로 useRef(가변 변수)에 둡니다.
  const lastSeen = useRef<{ value: string; at: number; count: number } | null>(null);
  const lastFired = useRef<{ value: string; at: number } | null>(null);
  // paused 가 바뀌어도 코드 스캐너 콜백을 재생성하지 않도록 ref 로 전달합니다.
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (!hasPermission) void requestPermission();
  }, [hasPermission, requestPermission]);

  const handleCodes = useCallback(
    (codes: Code[]) => {
      if (pausedRef.current) return;
      const now = Date.now();
      // 한 프레임에 여러 코드가 잡히면 첫 번째 유효 코드만 봅니다.
      let value: string | null = null;
      for (const c of codes) {
        value = normalizeBarcode(c);
        if (value) break;
      }
      if (!value) return;

      const prev = lastSeen.current;
      let cur: { value: string; at: number; count: number };
      if (prev && prev.value === value && now - prev.at <= CONFIRM_WINDOW_MS) {
        cur = { value, at: now, count: prev.count + 1 };
      } else {
        cur = { value, at: now, count: 1 };
      }
      lastSeen.current = cur;

      if (cur.count >= CONFIRM_COUNT) {
        const fired = lastFired.current;
        if (fired && fired.value === value && now - fired.at < cooldownMs) return;
        lastFired.current = { value, at: now };
        lastSeen.current = null;
        onBarcode(value);
      }
    },
    [onBarcode, cooldownMs],
  );

  const codeScanner = useCodeScanner({
    codeTypes: ['ean-13', 'ean-8', 'upc-a', 'qr'],
    onCodeScanned: handleCodes,
  });

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
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        codeScanner={codeScanner}
        torch={torch ? 'on' : 'off'}
        enableZoomGesture
        resizeMode="cover"
      />
      {/* 중앙 가이드 박스 */}
      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.guide}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
        </View>
        <Text style={styles.hint}>제품 바코드를 네모 안에 비춰주세요</Text>
      </View>
    </View>
  );
}

const CORNER = 22;
const STROKE = 3;

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', padding: 24 },
  message: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  sub: { color: '#D1D5DB', fontSize: 14, textAlign: 'center' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  guide: { width: 260, height: 170 },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#fff' },
  tl: { top: 0, left: 0, borderTopWidth: STROKE, borderLeftWidth: STROKE, borderTopLeftRadius: 8 },
  tr: { top: 0, right: 0, borderTopWidth: STROKE, borderRightWidth: STROKE, borderTopRightRadius: 8 },
  bl: { bottom: 0, left: 0, borderBottomWidth: STROKE, borderLeftWidth: STROKE, borderBottomLeftRadius: 8 },
  br: { bottom: 0, right: 0, borderBottomWidth: STROKE, borderRightWidth: STROKE, borderBottomRightRadius: 8 },
  hint: {
    marginTop: 18,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: colors.overlay,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    overflow: 'hidden',
  },
});
