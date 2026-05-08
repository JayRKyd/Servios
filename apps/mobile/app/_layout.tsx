import { useEffect, useRef } from 'react'
import { Stack, router } from 'expo-router'
import { useStore } from '@/store/store'
import {
  registerForPushNotifications,
  savePushToken,
  onNotificationTapped,
} from '@/services/notifications/PushNotificationService'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function RootLayout() {
  const { loadSession, isLoading, isAuthenticated, session, activeRole } = useStore((s) => ({
    loadSession: s.loadSession,
    isLoading: s.isLoading,
    isAuthenticated: s.isAuthenticated,
    session: (s as any).session,
    activeRole: (s as any).activeRole,
  }))

  const pushTokenRef = useRef<string | null>(null)

  useEffect(() => {
    loadSession()
  }, [loadSession])

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace('/(auth)/login')
      return
    }
    // Provider onboarding gate
    if (activeRole === 'provider' && session?.access_token) {
      fetch(`${API_URL}/api/v1/onboarding/status`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (!data.onboarding_complete && data.onboarding_step !== 'complete') {
            const step = data.onboarding_step ?? 'trade'
            router.replace(`/(onboarding)/${step}` as any)
          } else {
            router.replace('/(tabs)')
          }
        })
        .catch(() => router.replace('/(tabs)'))
    } else {
      router.replace('/(tabs)')
    }
  }, [isLoading, isAuthenticated, activeRole, session?.access_token])

  // Register push token once authenticated
  useEffect(() => {
    if (!isAuthenticated || !session?.access_token) return
    registerForPushNotifications().then((token) => {
      if (!token) return
      pushTokenRef.current = token
      savePushToken(token, session.access_token)
    })
  }, [isAuthenticated, session?.access_token])

  // Route notification taps to the relevant screen
  useEffect(() => {
    const unsub = onNotificationTapped((notification) => {
      const data = notification.request.content.data as Record<string, string>
      if (data?.screen === 'booking' && data?.bookingId) {
        router.push(('/(tabs)/bookings/' + data.bookingId) as any)
      }
    })
    return unsub
  }, [])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(onboarding)" />
    </Stack>
  )
}
