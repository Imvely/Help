/**
 * 회수 푸시 알림 토큰 등록 (docs/02 P1-4).
 *
 * expo-notifications 가 주는 "Expo 푸시 토큰"(ExponentPushToken[...]) 을 서버 POST /devices 에 등록하면
 * 서버가 Expo Push API 로 알림을 보냅니다(APNs/FCM 설정은 Expo 가 대신 처리).
 *
 * 주의: 시뮬레이터/에뮬레이터는 푸시 토큰을 받을 수 없습니다(expo-device 로 실기기 여부 확인).
 *       EAS 프로젝트 id(app.config.ts extra.eas.projectId)가 없으면 토큰 발급이 실패합니다.
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerDevice } from './api';
import { useSettings } from './settings';

export interface PushRegisterResult {
  ok: boolean;
  token?: string;
  error?: string;
}

/** Android 는 알림 채널이 있어야 알림이 표시됩니다(8.0+). iOS 에서는 no-op. */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('recall', {
    name: '회수·판매중지 알림',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

/** 권한 요청 → Expo 푸시 토큰 발급 → 서버 등록 → 로컬 설정 저장 */
export async function enableRecallPush(): Promise<PushRegisterResult> {
  if (!Device.isDevice) {
    return { ok: false, error: '시뮬레이터에서는 푸시 알림을 받을 수 없어요. 실기기에서 켜 주세요.' };
  }
  try {
    await ensureAndroidChannel();
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') {
      return { ok: false, error: '알림 권한이 거부되었어요. 설정에서 허용해 주세요.' };
    }

    const projectId: string | undefined =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

    await registerDevice({ expo_push_token: token, platform: Platform.OS === 'ios' ? 'ios' : 'android', enabled: true });
    await useSettings.getState().update({ pushEnabled: true, pushToken: token, pushRegisteredAt: Date.now() });
    return { ok: true, token };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** 서버에 enabled:false 로 알리고 로컬 토글을 끕니다. 서버 호출이 실패해도 로컬은 끕니다. */
export async function disableRecallPush(): Promise<PushRegisterResult> {
  const settings = useSettings.getState();
  let error: string | undefined;
  if (settings.pushToken) {
    try {
      await registerDevice({
        expo_push_token: settings.pushToken,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        enabled: false,
      });
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }
  await settings.update({ pushEnabled: false });
  return { ok: !error, error };
}
