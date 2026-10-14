/**
 * OAuth 콜백 경로 (`eodisan://auth/callback`).
 *
 * 로그인 결과는 expo-web-browser 의 openAuthSessionAsync 가 직접 돌려받아 src/data/auth.ts 에서 처리하므로
 * 이 화면이 실제로 뜨는 일은 드뭅니다. 다만 Android 에서 브라우저가 딥링크로 앱을 다시 열 때
 * "경로 없음" 화면이 보이지 않도록 홈으로 돌려보내는 자리만 둡니다.
 */
import { Redirect } from 'expo-router';

export default function AuthCallbackScreen() {
  return <Redirect href="/(tabs)" />;
}
