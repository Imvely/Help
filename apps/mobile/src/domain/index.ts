/**
 * 판정 로직 어댑터 (docs/03-architecture.md §5 `domain/`).
 *
 * 실제 판정 엔진은 모노레포의 `packages/domain`(@eodisan/domain) 입니다 — 순수 TypeScript, 런타임 의존성 없음.
 * 앱 코드는 이 파일만 import 하므로 패키지 경로·이름이 바뀌어도 여기 한 곳만 고치면 됩니다.
 *
 * 패키지는 소스(`packages/domain/src`)에서 직접 읽습니다:
 *   - tsc  : tsconfig.json 의 `paths["@eodisan/domain"]`
 *   - Metro: metro.config.js 의 `resolver.resolveRequest`
 * 따라서 `packages/domain/dist` 를 빌드하지 않아도 타입체크·번들링이 됩니다. (README "@eodisan/domain 연결" 참고)
 */
export {
  // 개인화 경고 (제품 × 프로필 → "⚠ 내 프로필")
  evaluateProduct,
  gradeSummary,
  // 원산지 3단 배지
  originBadges,
  originSummaryLine,
  involvesCountry,
  involvementText,
  countryLabel,
  countryInfo,
  COUNTRIES,
  ORIGIN_DISCLAIMER,
  // 카페인 한도
  caffeineLimitMg,
  // 알레르겐 코드 ↔ 한글
  allergenLabel,
  matchesAllergen,
  KR_MANDATORY_ALLERGENS,
  ALLERGEN_LABELS_KO,
} from '@eodisan/domain';

export type {
  EvaluateContext,
  OriginBadge,
  OriginBadgeLevel,
  OriginBadgeOptions,
  CountryInvolvement,
  CountryInfo,
} from '@eodisan/domain';
