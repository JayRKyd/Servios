import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { apiRequest } from '@/services/api/client'
import { useAuth } from '@/store/store'
export function InviteProviderScreen() {
  const { session } = useAuth()
  const [providerId, setProviderId] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function handleInvite() {
    if (!providerId) { setError('Enter provider ID'); return }
    if (!session) return
    setError(null); setLoading(true)
    try {
      await apiRequest('/api/v1/invitations', { method: 'POST', token: session.access_token, body: JSON.stringify({ provider_id: providerId, message: msg }) })
      router.back()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }
  return (
    <View style={s.container}>
      <TouchableOpacity onPress={() => router.back()} style={s.back}><Text style={s.backText}>Back</Text></TouchableOpacity>
      <Text style={s.title}>Invite Provider</Text>
      {error && <Text style={s.error}>{error}</Text>}
      <Text style={s.label}>Provider ID</Text>
      <TextInput style={s.input} value={providerId} onChangeText={setProviderId} placeholder='provider-uuid' placeholderTextColor='#9ca3af' />
      <Text style={s.label}>Message (optional)</Text>
      <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} value={msg} onChangeText={setMsg} multiline placeholder='Welcome to our network...' placeholderTextColor='#9ca3af' />
      <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]} onPress={handleInvite} disabled={loading}>
        {loading ? <ActivityIndicator color='#fff' /> : <Text style={s.btnText}>Send invitation</Text>}
      </TouchableOpacity>
    </View>
  )
}
export default InviteProviderScreen
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: 60, gap: 12 },
  back: { marginBottom: 4 }, backText: { color: '#1a56db', fontSize: 15 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb' },
  btn: { backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' }, error: { color: '#ef4444', fontSize: 13 },
})