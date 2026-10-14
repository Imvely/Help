# @eodisan/mobile — 어디산 모바일 앱

Expo(React Native) 기반 iOS/Android 앱. 제품 바코드를 비추면 원산지·성분 등급·개인화 경고를 결과 카드로 보여줍니다.
설계 근거는 [docs/02-product-spec.md](../../docs/02-product-spec.md), [docs/03-architecture.md](../../docs/03-architecture.md) 를 참고하세요.

## 실행 방법

**Expo Go 로는 실행할 수 없습니다.** VisionCamera 가 네이티브 모듈이라 개발용 빌드(dev client)가 필요합니다.

```bash
cd apps/mobile
npm install

# 네이티브 프로젝트(ios/, android/) 생성 — app.config.ts 의 플러그인 설정이 여기서 반영됩니다
npx expo prebuild

# 실기기 연결 후 (시뮬레이터/에뮬레이터는 카메라가 없어 스캔이 되지 않습니다)
npx expo run:ios      # macOS + Xcode 필요
npx expo run:android  # Android Studio + SDK 필요

# 이후 JS 만 바꿀 때는 Metro 만 켜면 됩니다
npm start
```

| 스크립트 | 역할 |
|---|---|
| `npm start` | Metro 번들러 (dev client 모드) |
| `npm run ios` / `npm run android` | 네이티브 빌드 + 설치 + 실행 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `expo lint` (ESLint) |

### 환경변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://localhost:8000/v1` | FastAPI 서버 베이스 URL. 실기기에서는 `localhost` 대신 PC 의 LAN IP 를 넣으세요 (예: `http://192.168.0.10:8000/v1`). |

`.env` 파일에 `EXPO_PUBLIC_API_URL=...` 로 적으면 Expo 가 자동으로 읽습니다(`EXPO_PUBLIC_` 접두사가 있는 값만 번들에 포함).

## 선택한 버전과 이유 (2026-10-14 기준)

| 패키지 | 버전 | 비고 |
|---|---|---|
| expo | **SDK 57** (`~57.0.28`) | npm `latest`. 문서(ADR-0001)가 쓰일 때는 SDK 55 였으나 현재 최신 안정 버전은 57. React Native 0.86.3 / React 19.2.3 |
| expo-router | `~57.0.26` | 파일 기반 라우팅 |
| react-native-vision-camera | **4.7.3** (v4 최신) | 아래 설명 |
| react-native-worklets-core | `^1.6.3` | VisionCamera v4 프레임 프로세서용(선택 의존성). 바코드 스캔만 쓸 때는 없어도 됨 |
| react-native-reanimated / react-native-worklets | `4.5.1` / `0.10.1` | SDK 57 번들 버전. 결과 카드 애니메이션 |
| expo-sqlite / expo-secure-store | `~57.0.4` | 제품 캐시(7일·5,000건) / 건강 프로필 |
| @tanstack/react-query / zustand | `^5.104` / `^5.0` | 서버 상태 / UI·프로필 상태 |

### 왜 VisionCamera v5 가 아니라 v4 인가

ADR-0001 은 v5 를 목표로 하지만, 이 스캐폴드는 **v4.7.3** 을 씁니다.

- v5(5.2.3) 는 Nitro Modules 기반으로 **완전히 새로 쓰인 API** 입니다 (`useCamera`, `useObjectOutput`, `usePermission`…). `useCodeScanner`, `<Camera codeScanner>` 가 없고, npm 패키지 안에 **Expo config plugin 이 없어** `app.config.ts` 의 `cameraPermissionText` 같은 설정을 쓸 수 없습니다. `react-native-nitro-modules` + `react-native-nitro-image` 를 추가로 요구합니다.
- v4.7.x 는 New Architecture(RN 0.86) 를 지원하고, 내장 코드 스캐너(ML Kit / AVFoundation)와 Expo 플러그인이 안정적입니다. 바코드 경로(docs/03 §3 "바코드 먼저")는 프레임 프로세서 없이 `useCodeScanner` 만으로 충분합니다.
- 이후 블러 게이트·온디바이스 임베딩(docs/03 §3-1)을 붙일 때 v5 로 올리면 됩니다. 카메라 코드는 `src/camera/ScanCamera.tsx` 한 파일에 격리돼 있습니다.

주의: VisionCamera v4 는 Android `minSdkVersion 26` 이상을 요구합니다. SDK 57 기본값이 더 낮다면 `expo-build-properties` 플러그인으로 올리세요. `babel.config.js` 에는 `react-native-worklets-core/plugin` 이 들어 있고 `babel-preset-expo` 가 Reanimated 4 의 `react-native-worklets/plugin` 을 자동으로 붙입니다. 두 플러그인이 충돌하는 빌드 오류가 나면 `app.config.ts` 의 `enableFrameProcessors: false` 로 두고 babel 플러그인을 제거해도 바코드 스캔은 동작합니다.

## 폴더 구조

```
app/                      Expo Router — 파일 경로 = 화면 URL
  _layout.tsx             전역 Provider(Query, GestureHandler, SafeArea) + 화면 스택
  (tabs)/_layout.tsx      하단 탭: 스캔 / 기록 / 프로필
  (tabs)/index.tsx        스캔(홈): 전체 화면 카메라 + 결과 카드
  (tabs)/history.tsx      로컬 스캔 기록
  (tabs)/profile.tsx      건강 프로필(알레르기·카페인·임신·당뇨·고혈압)
  product/[id].tsx        제품 상세: 원산지 / 성분 / 영양 / 출처 탭
  search.tsx              텍스트 검색
  ocr.tsx                 라벨 OCR 폴백(플레이스홀더)
  correction.tsx          "정보가 틀려요" 정정 요청 모달
src/
  camera/ScanCamera.tsx   VisionCamera + 코드 스캐너, 2프레임 확인 디바운스, UPC-A→EAN-13 정규화
  data/types.ts           API 응답·프로필·경고 타입 (@eodisan/domain 과 동일 형태)
  data/api.ts             fetch 클라이언트 (AbortController, RFC 9457 에러)
  data/cache.ts           expo-sqlite: products 캐시(TTL 7일, LRU 5000) + scans 히스토리
  data/profile.ts         expo-secure-store + zustand 프로필 스토어
  data/useProduct.ts      캐시 우선 → 서버 조회 훅(TanStack Query)
  domain/index.ts         판정 로직 어댑터 — @eodisan/domain 으로 교체할 단일 지점
  ui/                     ResultCard, GradeChip, OriginBadge, Section, theme
```

## `@eodisan/domain` 연결

`packages/domain` 은 `file:../../packages/domain` 으로 연결돼 있습니다(npm 은 `workspace:*` 를 지원하지 않음).
패키지가 `dist/` 를 빌드하기 전까지는 `src/domain/index.ts` 의 **로컬 폴백 구현**(알레르기·회수·카페인·당뇨·고혈압·신장)을 씁니다.
패키지가 준비되면:

```bash
(cd ../../packages/domain && npm run build)
```

그리고 `src/domain/index.ts` 상단의 TODO 대로 로컬 구현을 지우고 `export ... from '@eodisan/domain'` 으로 바꾸면 됩니다. 타입은 이미 같은 형태입니다.

## React Native 가 처음이라면

- **컴포넌트 = 함수**: 화면은 JSX 를 반환하는 함수입니다. `useState` 가 바뀌면 함수가 다시 실행되어 화면이 갱신됩니다.
- **훅(hook)** 은 `use` 로 시작하는 함수이며 컴포넌트 최상단에서만 호출합니다.
- `StyleSheet.create` 는 CSS 비슷한 객체입니다(flexbox 기본, 단위는 dp).
- 네이티브 모듈(카메라·SQLite·SecureStore)을 추가/변경하면 `npx expo prebuild` 후 다시 빌드해야 합니다. JS 만 바꿨으면 Metro 가 즉시 반영합니다.
