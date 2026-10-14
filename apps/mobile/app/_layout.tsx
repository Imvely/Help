/**
 * 루트 레이아웃. Expo Router 는 app/ 폴더의 파일 경로가 곧 화면 URL 입니다(파일 기반 라우팅).
 * `_layout.tsx` 는 하위 화면을 감싸는 공통 틀: 여기서 전역 Provider 를 한 번만 설정합니다.
 *
 * - GestureHandlerRootView : 제스처 라이브러리 루트(앱 전체를 감싸야 함)
 * - SafeAreaProvider       : 노치·홈바 여백 정보 제공
 * - QueryClientProvider    : TanStack Query 캐시
 * - Stack                  : 화면 스택(탭 그룹 → 상세 → 모달)
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useProfile } from '@/data/profile';

// 서버 상태 캐시. gcTime(메모리 보존)은 30분, 재시도는 각 훅에서 결정합니다.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { gcTime: 30 * 60 * 1000, retry: 1, refetchOnWindowFocus: false },
  },
});

export default function RootLayout() {
  const loadProfile = useProfile((s) => s.load);

  // 앱 시작 시 SecureStore 에서 건강 프로필을 한 번 읽어옵니다.
  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerBackTitle: '뒤로', headerTintColor: '#111827' }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="product/[id]" options={{ title: '제품 상세' }} />
            <Stack.Screen name="search" options={{ title: '검색' }} />
            <Stack.Screen name="ocr" options={{ title: '라벨 촬영', presentation: 'fullScreenModal' }} />
            <Stack.Screen name="correction" options={{ title: '정보가 틀려요', presentation: 'modal' }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
