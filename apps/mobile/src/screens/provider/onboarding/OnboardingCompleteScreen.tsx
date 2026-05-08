import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'

export function OnboardingCompleteScreen() {
  return (
    <View style={s.container}>
      <View style={s.content}>
        <Text style={s.emoji}>🎉</Text>
        <Text style={s.title}>Application Submitted!</Text>
        <Text style={s.body}>
          Your profile and documents are under review. We'll notify you once your account is verified — usually within 24–48 hours.
        </Text>

        <View style={s.steps}>
          {[
            { icon: '✅', text: 'Trade category saved' },
            { icon: '✅', text: 'Services configured' },
            { icon: '✅', text: 'Documents uploaded' },
            { icon: '⏳', text: 'Awaiting admin verification' },
          ].map((item) => (
            <View key={item.text} style={s.stepItem}>
              <Text style={s.stepIcon}>{item.icon}</Text>
              <Text style={s.stepText}>{item.text}</Text>
            </View>
          ))}
        </View>

        <View style={s.notice}>
          <Text style={s.noticeText}>
            You'll receive a push notification and email once you're verified and can start accepting jobs.
          </Text>
        </View>
      </View>

      <View style={s.footer}>
        <TouchableOpacity style={s.btn} onPress={() => router.replace('/(tabs)')}>
          <Text style={s.btnText}>View My Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default OnboardingCompleteScreen

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { flex: 1, padding: 28, paddingTop: 80, alignItems: 'center', gap: 16 },
  emoji: { fontSize: 64, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827', textAlign: 'center' },
  body: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 23, maxWidth: 320 },
  steps: { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 18, gap: 12, marginTop: 8 },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepIcon: { fontSize: 18 },
  stepText: { fontSize: 15, color: '#374151', fontWeight: '500' },
  notice: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, width: '100%' },
  noticeText: { fontSize: 13, color: '#1e40af', lineHeight: 19, textAlign: 'center' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  btn: { backgroundColor: '#1a56db', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
