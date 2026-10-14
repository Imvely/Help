# ADR-0001: 모바일 프레임워크 — Expo(React Native) + VisionCamera v5

- 상태: 제안(승인 대기)
- 날짜: 2026-10-13

## 맥락
iOS/Android 동시 지원, 셔터 없는 실시간 인식(30fps 프레임 처리), 온디바이스 ML(바코드·OCR·임베딩)이 필요. 개발자는 1인, CV/PyTorch/FastAPI 배경.

## 선택지
1. **Expo + React Native + react-native-vision-camera v5** — 프레임 프로세서(worklet)가 JS 스레드를 거치지 않고 네이티브에서 실행. 바코드(ML Kit)·GPU 리사이저·fast-tflite/ExecuTorch 바인딩이 같은 생태계.
2. Flutter + camera + google_mlkit_* — 성숙하지만 `startImageStream`이 platform channel 직렬화로 고fps 병목(DeepAR 경험담). FFI 기반 대안은 초기 단계.
3. Kotlin Multiplatform — 카메라/ML 공용 추상화 없음, 두 플랫폼 네이티브를 직접 작성.
4. 네이티브 2벌 — 1인에게 비현실적.

## 결정
1번. 무거운 CV 코드는 Swift/Kotlin Nitro 플러그인으로 작성하고 모델 export(Core ML/ExecuTorch/TFLite)에 집중. EAS Build/Update/Notifications로 앱 인프라 해결.

## 결과
- Expo Go 사용 불가(dev build 필수). 버전 고정과 분기 1회 업그레이드 정책.
- Nitro/worklets 생태계가 젊어 이슈 추적 필요.

## 후속 결정 (2026-10-14, 스캐폴드 시점)
- 실제 스캐폴드는 **Expo SDK 57 + VisionCamera 4.7.x** 로 시작한다. v5(5.2.x)는 Nitro 전면 재작성으로
  내장 `useCodeScanner` 와 Expo config plugin 이 없어 바코드 MVP(M1) 경로가 길어진다.
  v4 는 RN 0.86 New Architecture 를 지원하고 ML Kit/AVFoundation 코드 스캐너를 내장한다.
- 카메라 코드는 `apps/mobile/src/camera/ScanCamera.tsx` 한 파일에 격리해 M4(이미지 인식, 프레임 프로세서 필요)
  시점에 v5 로 이전한다.
