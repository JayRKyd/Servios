import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { maintenanceApi } from '@/services/api/maintenance.api'
import { useAuth } from '@/store/store'
export function ReportIssueScreen() {
  const { session, user } = useAuth()
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [priority, setPriority] = useState<'low'|'medium'|'high'|'emergency'>('medium')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function handleSubmit() {
    if (!title || !desc) { setError('Fill in all fields'); return }
    const propId = user?.tenant_profiles?.[0]?.property_id
    if (!propId) { setError('No property assigned'); return }
    if (!session) return
    setError(null); setLoading(true)
    try {
      await maintenanceApi.create({ property_id: propId, title, description: desc, priority }, session.access_token)
      router.back()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }
  return (
    <ScrollView style={s.container} contentContainerStyle={s.inner} keyboardShouldPersistTaps='handled'>
      <TouchableOpacity onPress={() => router.back()} style={s.back}><Text style={s.backText}>Back</Text></TouchableOpacity>
      <Text style={s.title}>Report an Issue</Text>
      {error && <Text style={s.error}>{error}</Text>}
      <Text style={s.label}>Issue title</Text>
      <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder='Broken AC, leaking pipe...' placeholderTextColor='#9ca3af' />
      <Text style={s.label}>Description</Text>
      <TextInput style={[s.input, { height: 100, textAlignVertical: 'top' }]} value={desc} onChangeText={setDesc} multiline placeholder='Describe the issue in detail' placeholderTextColor='#9ca3af' />
      <Text style={s.label}>Priority</Text>
      <View style={s.priorityRow}>
        {(['low','medium','high','emergency'] as const).map(p => (
          <TouchableOpacity key={p} style={[s.priChip, priority === p && s.priChipActive]} onPress={() => setPriority(p)}>
            <Text style={[s.priText, priority === p && s.priTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }, priority === 'emergency' && { backgroundColor: '#ef4444' }]} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color='#fff' /> : <Text style={s.btnText}>{priority === 'emergency' ? 'Report Emergency' : 'Submit Report'}</Text>}
      </TouchableOpacity>
    </ScrollView>
  )
}
export default ReportIssueScreen
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' }, inner: { padding: 24, paddingTop: 60, gap: 10 },
  back: { marginBottom: 8 }, backText: { color: '#1a56db', fontSize: 15 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb' },
  priorityRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  priChip: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  priChipActive: { borderColor: '#1a56db', backgroundColor: '#eff6ff' },
  priText: { fontSize: 13, color: '#6b7280', textTransform: 'capitalize' },
  priTextActive: { color: '#1a56db', fontWeight: '600' },
  btn: { backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' }, error: { color: '#ef4444', fontSize: 13 },
})