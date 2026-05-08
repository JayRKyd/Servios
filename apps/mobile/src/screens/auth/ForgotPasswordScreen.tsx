import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/store/store'

export function ForgotPasswordScreen() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleReset() {
    if (!email) { setError('Enter your email'); return }
    setError(null); setLoading(true)
    try { await resetPassword(email); setSent(true) }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }

  if (sent) return (
    <View style={s.container}>
      <Text style={s.title}>Check your email</Text>
      <Text style={s.sub}>A reset link was sent to {email}</Text>
      <TouchableOpacity style={s.btn} onPress={() => router.replace('/(auth)/login')}>
        <Text style={s.btnText}>Back to sign in</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={s.container}>
      <TouchableOpacity onPress={() => router.back()} style={s.back}><Text style={s.backText}>← Back</Text></TouchableOpacity>
      <Text style={s.title}>Forgot password?</Text>
      <Text style={s.sub}>Enter your email and we'll send a reset link.</Text>
      {error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}
      <TextInput style={s.input} placeholder="Email" placeholderTextColor="#9ca3af" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleReset} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Send reset link</Text>}
      </TouchableOpacity>
    </View>
  )
}
export default ForgotPasswordScreen

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 24, paddingTop: 60, gap: 16 },
  back: { marginBottom: 8 },
  backText: { color: '#1a56db', fontSize: 15 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 14, color: '#6b7280' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb' },
  btn: { backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 12 },
  errorText: { color: '#ef4444', fontSize: 13 },
})
