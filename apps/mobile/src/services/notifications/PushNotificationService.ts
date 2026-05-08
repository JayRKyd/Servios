import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { apiRequest } from '@/services/api/client'

// Present notifications while app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

/**
 * Request permission and return the Expo push token.
 * Returns null if permission is denied or running on a simulator.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[PUSH] Physical device required for push notifications')
    return null
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('[PUSH] Permission denied')
    return null
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Servios',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1a56db',
    })
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  })

  return tokenData.data
}

/** Save push token to API so the server can notify this device. */
export async function savePushToken(token: string, authToken: string): Promise<void> {
  try {
    await apiRequest('/api/v1/push-tokens', {
      method: 'POST',
      token: authToken,
      body: JSON.stringify({ token, platform: 'expo' }),
    })
  } catch (e) {
    console.error('[PUSH] Failed to save token:', e)
  }
}

/** Remove push token from API on logout. */
export async function removePushToken(token: string, authToken: string): Promise<void> {
  try {
    await apiRequest('/api/v1/push-tokens', {
      method: 'DELETE',
      token: authToken,
      body: JSON.stringify({ token }),
    })
  } catch (e) {
    console.error('[PUSH] Failed to remove token:', e)
  }
}

/** Listen for notification taps. Returns unsubscribe function. */
export function onNotificationTapped(
  handler: (notification: Notifications.Notification) => void
): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((r) => handler(r.notification))
  return () => sub.remove()
}

/** Listen for foreground notifications. Returns unsubscribe function. */
export function onNotificationReceived(
  handler: (notification: Notifications.Notification) => void
): () => void {
  const sub = Notifications.addNotificationReceivedListener(handler)
  return () => sub.remove()
}
