/**
 * 하단 탭 레이아웃: 스캔(홈) / 기록 / 프로필.
 * 폴더명 `(tabs)` 의 괄호는 "URL 에는 나타나지 않는 그룹" 이라는 뜻입니다.
 */
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { colors } from '@/ui/theme';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerTitleAlign: 'center',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '스캔',
          headerShown: false, // 카메라가 전체 화면을 써야 하므로 헤더 없음
          tabBarIcon: ({ focused }) => <TabIcon emoji="📷" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: '기록', tabBarIcon: ({ focused }) => <TabIcon emoji="🕘" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: '프로필', tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }}
      />
    </Tabs>
  );
}
