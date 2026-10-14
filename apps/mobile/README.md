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
| `EXPO_PUBLIC_SUPABASE_URL` | (없음) | Supabase 프로젝트 URL (`https://xxxx.supabase.co`). 로그인·동기화(M11/M12)에 필요. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | (없음) | Supabase anon(public) 키. 두 값이 모두 없으면 `authAvailable=false` 가 되어 프로필 탭에 "로그인은 준비 중입니다(서버 설정 필요)" 가 표시되고, 나머지 기능은 전부 비회원으로 동작합니다. |

`.env` 파일에 `EXPO_PUBLIC_API_URL=...` 로 적으면 Expo 가 자동으로 읽습니다(`EXPO_PUBLIC_` 접두사가 있는 값만 번들에 포함).
anon 키는 공개용 키이므로 번들에 들어가도 괜찮지만, service_role 키는 **절대** 넣지 마세요.

Supabase 쪽 준비: Authentication → Providers 에서 **Anonymous sign-ins** 켜기, **Kakao**·**Google**·**Apple** provider 설정,
Redirect URLs 에 `eodisan://auth/callback` 추가. (Naver 는 Custom OAuth2 로 등록해야 하며 아직 앱에 버튼이 없습니다.)

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
| expo-image-manipulator | `~57.0.21` | 라벨 사진 리사이즈·JPEG 압축(긴 변 1600px) 후 OCR 업로드 |
| @supabase/supabase-js | `^2.117.3` | 인증(익명 → 카카오/Google/Apple). 세션은 `expo-sqlite/kv-store` 에 저장 |
| react-native-url-polyfill | `^4.0.0` | supabase-js 가 요구하는 URL 폴리필(`auth.ts` 에서 `/auto` import) |
| expo-web-browser | `~57.0.3` | OAuth 로그인 창(`openAuthSessionAsync`) |
| expo-apple-authentication | `~57.0.2` | Sign in with Apple (iOS 전용, App Store 4.8) |
| expo-notifications / expo-device | `~57.0.22` / `~57.0.2` | 회수 푸시 토큰 발급(P1-4) / 실기기 여부 판별 |

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
  ocr.tsx                 라벨 OCR 폴백: 촬영 → 업로드 → 폴링 → 확인·수정 → 제보 (M8)
  correction.tsx          "정보가 틀려요" 정정 요청 모달
  auth/callback.tsx       OAuth 딥링크(eodisan://auth/callback) 착지 → 홈으로 리다이렉트
src/
  camera/ScanCamera.tsx   VisionCamera + 코드 스캐너, 2프레임 확인 디바운스, UPC-A→EAN-13 정규화
  camera/LabelCamera.tsx  VisionCamera photo 모드: 라벨 정지 사진 촬영(가이드 박스·플래시·셔터)
  data/types.ts           API 계약 타입. 제품·프로필 등 공유 타입은 @eodisan/domain 에서 re-export
  data/api.ts             fetch 클라이언트 (AbortController, RFC 9457 에러, Bearer 토큰·X-Anonymous-Id 자동 첨부, multipart)
  data/cache.ts           expo-sqlite: products 캐시(TTL 7일, LRU 5000) + scans 히스토리(synced 열)
  data/profile.ts         expo-secure-store + zustand 프로필 스토어 (민감정보, 항상 로컬이 원본)
  data/settings.ts        동기화 동의·푸시 등록 상태 등 비민감 설정 (expo-sqlite/kv-store)
  data/auth.ts            Supabase 클라이언트 + useAuth 스토어 (익명 세션, 카카오/Google/Apple)
  data/sync.ts            PUT/GET /me/profiles, POST /me/scans — 로그인 시 병합·업로드
  data/push.ts            expo-notifications 토큰 발급 → POST /devices
  data/ocr.ts             사진 리사이즈 + /ocr/label 업로드 + /ocr/jobs 폴링
  data/useProduct.ts      캐시 우선 → 서버 조회 훅(TanStack Query)
  domain/index.ts         @eodisan/domain 얇은 re-export (앱 코드는 이 파일만 import)
  ui/                     ResultCard, GradeChip, OriginBadge, Section, LabelEditor(OCR 수정 폼), theme
```

## `@eodisan/domain` 연결

판정 엔진(`packages/domain`)은 `file:../../packages/domain` 의존성(심볼릭 링크)이고, `src/domain/index.ts` 는 그 패키지의 얇은 re-export 입니다.
앱 코드는 `@/domain` 만 import 하고, `src/data/types.ts` 도 제품·프로필 타입을 패키지에서 다시 내보내므로 타입이 두 곳에서 어긋날 일이 없습니다.

**소스에서 직접 읽습니다(빌드 불필요).** 패키지의 `package.json#exports` 는 `dist/` 를 가리키지만 `dist/` 는 gitignore 라서
새로 clone 한 환경에서 바로 돌아가도록 두 도구 모두 `packages/domain/src/index.ts` 로 우회합니다:

| 도구 | 설정 | 비고 |
|---|---|---|
| tsc (`npm run typecheck`) | `tsconfig.json` → `paths["@eodisan/domain"] = ["../../packages/domain/src/index.ts"]` | `moduleResolution: bundler` 라 패키지 안의 `./types.js` import 가 `.ts` 로 해석됩니다 |
| Metro (`npm start`) | `metro.config.js` → `resolver.resolveRequest` | `@eodisan/domain` 을 소스 엔트리로 바꾸고, 패키지 소스 안의 상대 `.js` import 는 확장자를 떼서 `.ts` 를 찾게 합니다. `watchFolders` 에 패키지 폴더를 넣어 핫리로드도 됩니다 |

`(cd ../../packages/domain && npm run build)` 로 `dist/` 를 만들어도 무방하지만(서버 테스트 등 다른 소비자용) 앱은 그것을 쓰지 않습니다.

## 라벨 OCR 흐름 (M8, `app/ocr.tsx`)

진입: 스캔 화면에서 바코드가 404 일 때 "뒷면을 비춰 OCR로 등록하기"(`/ocr?ean13=…`) 또는 제품 상세 원산지 탭의 "뒷면 라벨 촬영해 등록"(`/ocr?product_id=…`).

1. **촬영** — `LabelCamera`(VisionCamera `photo` 모드) 로 정지 사진. 가이드 "원재료명 영역을 네모 안에".
2. **업로드** — `expo-image-manipulator` 로 긴 변 1600px·JPEG 85% 로 줄인 뒤 `POST /v1/ocr/label` (multipart `image` + `ean13`/`product_id` 폼 필드) → `202 { job_id, status }`.
3. **폴링** — `GET /v1/ocr/jobs/{job_id}` 를 1초마다, 최대 60초. `status: queued|running|done|failed`, `result: LabelExtraction|null`.
4. **확인·수정** — `LabelEditor` 에서 원재료(이름 + 원산지 프리셋 국산/중국산/미국산/외국산/알 수 없음 + 직접 입력), 제조국·제조원·판매원, 카페인 mg, 알레르기 포함/혼입 가능 칩(식약처 19항목)을 고칩니다. `product_id` 가 없으면 제품명·브랜드·분류(식품/화장품) 입력란이 추가됩니다.
5. **제보** — `POST /v1/contributions/label` `{ job_id, ean13?, product_id?, product_name?, brand?, category?, extraction }` → `201 { product_id, created }`. 성공하면 바코드 쿼리를 무효화(스캔 화면이 새 제품을 보게)하고 `/product/{product_id}` 로 이동합니다.

화면에는 "제보해 주신 정보는 '사용자 제보(미검증)'으로 표시되며 3명 이상 일치하면 검증됨으로 바뀝니다." 를 고정 표시합니다(docs/02 §7).
데이터 로직은 `src/data/ocr.ts`(리사이즈·업로드·폴링, AbortSignal 취소), API 함수는 `src/data/api.ts` 의 `submitLabelOcr` / `getOcrJob` / `submitLabelContribution` 입니다.

> 현재 `apps/api` 의 `/ocr/label` 은 인메모리 큐 스텁이라 실제 OCR 워커 없이는 `queued` 에서 멈춥니다(테스트용 `text` 폼 필드로 즉시 파싱 가능). `/contributions/label`, `/products/{id}/alternatives`, `/me/*` 는 앱 쪽 계약만 먼저 구현된 상태입니다.

## 로그인·동기화·푸시 (M11 / M12 / P1-4)

- **익명 세션**: 앱 시작 시 `signInAnonymously` (서버 설정이 있을 때). 모든 API 요청에 `Authorization: Bearer <JWT>` 와 `X-Anonymous-Id`(기기 UUID, SecureStore) 가 붙습니다.
- **로그인**: 프로필 탭 → 카카오 / Google 은 `linkIdentity`(익명 계정 승격, user id 유지) + `expo-web-browser`, Apple 은 iOS 에서만 `expo-apple-authentication` → `signInWithIdToken`. 세 버튼은 같은 크기로 나란히 노출됩니다(App Store 4.8).
- **동기화(opt-in)**: "민감정보 동기화 동의" 토글을 켜고 로그인한 경우에만 `PUT /v1/me/profiles` (`payload` 는 프로필 JSON 문자열, 서버가 암호화). 로그인 직후 `GET /v1/me/profiles` 로 병합하되 **로컬 SecureStore 가 항상 원본**(로컬이 비어 있을 때만 서버 값을 가져옴).
- **히스토리**: 로그인 직후 `scans.synced = 0` 인 행을 `POST /v1/me/scans` 로 올리고 `synced = 1` 표시(`cache.ts` 의 마이그레이션 가드가 열을 추가).
- **회수 알림**: "회수 알림 받기" 토글 → 권한 요청 → Expo 푸시 토큰 → `POST /v1/devices { expo_push_token, platform, enabled }`. 끄면 `enabled:false` 로 다시 보냅니다. 실기기 + `extra.eas.projectId` 가 필요합니다.

## React Native 가 처음이라면

- **컴포넌트 = 함수**: 화면은 JSX 를 반환하는 함수입니다. `useState` 가 바뀌면 함수가 다시 실행되어 화면이 갱신됩니다.
- **훅(hook)** 은 `use` 로 시작하는 함수이며 컴포넌트 최상단에서만 호출합니다.
- `StyleSheet.create` 는 CSS 비슷한 객체입니다(flexbox 기본, 단위는 dp).
- 네이티브 모듈(카메라·SQLite·SecureStore)을 추가/변경하면 `npx expo prebuild` 후 다시 빌드해야 합니다. JS 만 바꿨으면 Metro 가 즉시 반영합니다.
