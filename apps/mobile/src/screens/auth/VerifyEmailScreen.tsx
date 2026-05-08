import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
export function VerifyEmailScreen() {
  return (
    <View style={s.container}>
      <Text style={s.emoji}>📬</Text>
      <Text style={s.title}>Verify your email</Text>
      <Text style={s.sub}>We sent a confirmation link to your email. Click it to activate your account.</Text>
      <Text style={s.hint}>Didn't receive it? Check your spam folder.</Text>
      <TouchableOpacity style={s.btn} onPress={() => router.replace('/(auth)/login')}>
        <Text style={s.btnText}>Back to sign in</Text>
      </TouchableOpacity>
    </View>
  )
}
export default VerifyEmailScreen
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center', gap: 16 },
  emoji: { fontSize: 56 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', textAlign: 'center' },
  sub: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  hint: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
  btn: { backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})
