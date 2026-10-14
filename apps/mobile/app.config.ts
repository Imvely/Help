// Expo 앱 설정 파일. (iOS Info.plist / Android Manifest 에 들어갈 값과 네이티브 플러그인을 여기서 선언합니다.)
// `npx expo prebuild` 를 실행하면 이 설정이 ios/, android/ 네이티브 프로젝트로 변환됩니다.
import type { ConfigContext, ExpoConfig } from 'expo/config';

const CAMERA_PERMISSION_TEXT = '제품 바코드와 라벨을 인식해 정보를 보여주기 위해 사용합니다.';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: '어디산',
  slug: 'eodisan',
  version: '0.1.0',
  scheme: 'eodisan', // 딥링크 스킴: eodisan://product/123
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'app.eodisan.mobile',
    supportsTablet: false,
    infoPlist: {
      NSCameraUsageDescription: CAMERA_PERMISSION_TEXT,
      // 한국어 UI 기본값
      CFBundleDevelopmentRegion: 'ko',
    },
  },
  android: {
    package: 'app.eodisan.mobile',
    permissions: ['android.permission.CAMERA'],
  },
  plugins: [
    'expo-router',
    [
      'react-native-vision-camera',
      {
        cameraPermissionText: CAMERA_PERMISSION_TEXT,
        enableMicrophonePermission: false,
        // 바코드 스캐너(ML Kit)는 코드 스캐너 모델을 번들에 포함해 첫 스캔 지연을 없앱니다.
        enableCodeScanner: true,
        // 프레임 프로세서(블러 게이트·임베딩 등 docs/03 §3)는 react-native-worklets-core 가 필요합니다.
        enableFrameProcessors: true,
      },
    ],
    'expo-sqlite',
    'expo-secure-store',
  ],
  experiments: {
    // 라우트 문자열 타입 검사는 `expo start` 가 .expo/types 를 생성해야 동작하므로 우선 끕니다.
    typedRoutes: false,
  },
  extra: {
    eas: {
      // EAS Build 를 쓸 때 `eas init` 으로 projectId 를 채웁니다.
    },
  },
});
