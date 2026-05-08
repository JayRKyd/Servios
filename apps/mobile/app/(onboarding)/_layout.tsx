import { Stack } from 'expo-router'

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="trade" />
      <Stack.Screen name="services" />
      <Stack.Screen name="documents" />
      <Stack.Screen name="complete" />
    </Stack>
  )
}
