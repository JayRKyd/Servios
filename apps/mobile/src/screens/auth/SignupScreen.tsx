import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/store/store'
import type { Role } from '@/types'

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: 'customer', label: 'Customer', desc: 'Book home services' },
  { value: 'provider', label: 'Provider', desc: 'Offer your services' },
  { value: 'landlord', label: 'Landlord', desc: 'Manage properties' },
  { value: 'tenant', label: 'Tenant', desc: 'Manage your rental' },
]

export function SignupScreen() {
  const { signUp } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('customer')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSignUp() {
    if (!fullName || !email || !password) { setError('Please fill in all required fields'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setError(null); setLoading(true)
    try {
      await signUp(email, password, { full_name: fullName, phone: phone || undefined, role })
      router.replace('/(auth)/verify-email')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
      <Text style={s.logo}>Servios</Text>
      <Text style={s.title}>Create account</Text>
      {error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}

      <TextInput style={s.input} placeholder="Full name *" placeholderTextColor="#9ca3af" value={fullName} onChangeText={setFullName} autoComplete="name" />
      <TextInput style={s.input} placeholder="Email *" placeholderTextColor="#9ca3af" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={s.input} placeholder="Phone (optional)" placeholderTextColor="#9ca3af" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput style={s.input} placeholder="Password * (min 8 chars)" placeholderTextColor="#9ca3af" value={password} onChangeText={setPassword} secureTextEntry />

      <Text style={s.label}>I want to</Text>
      <View style={s.roleGrid}>
        {ROLES.map(r => (
          <TouchableOpacity key={r.value} style={[s.roleCard, role === r.value && s.roleCardActive]} onPress={() => setRole(r.value)}>
            <Text style={[s.roleLabel, role === r.value && s.roleLabelActive]}>{r.label}</Text>
            <Text style={s.roleDesc}>{r.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleSignUp} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Create account</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
        <Text style={s.footer}>Already have an account? <Text style={s.link}>Sign in</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  )
}
export default SignupScreen

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40, gap: 12 },
  logo: { fontSize: 28, fontWeight: '800', color: '#1a56db', textAlign: 'center', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleCard: { width: '47%', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12 },
  roleCardActive: { borderColor: '#1a56db', backgroundColor: '#eff6ff' },
  roleLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  roleLabelActive: { color: '#1a56db' },
  roleDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  btn: { backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  link: { color: '#1a56db', fontWeight: '500' },
  footer: { textAlign: 'center', color: '#6b7280', fontSize: 14 },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 12 },
  errorText: { color: '#ef4444', fontSize: 13 },
})
