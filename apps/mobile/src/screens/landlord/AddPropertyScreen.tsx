import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { propertiesApi } from '@/services/api/properties.api'
import { useAuth } from '@/store/store'
export function AddPropertyScreen() {
  const { session } = useAuth()
  const [name, setName] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [island, setIsland] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function handleAdd() {
    if (!name || !street || !city || !island) { setError('Fill in all fields'); return }
    if (!session) return
    setError(null); setLoading(true)
    try {
      await propertiesApi.create({ name, property_type: 'residential', address: { street, city, island } }, session.access_token)
      router.back()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }
  return (
    <ScrollView style={s.container} contentContainerStyle={s.inner} keyboardShouldPersistTaps='handled'>
      <TouchableOpacity onPress={() => router.back()} style={s.back}><Text style={s.backText}>Back</Text></TouchableOpacity>
      <Text style={s.title}>Add Property</Text>
      {error && <Text style={s.error}>{error}</Text>}
      {[['Property name', name, setName, 'My Property'],['Street address', street, setStreet, '123 Bay St'],['City', city, setCity, 'Nassau'],['Island', island, setIsland, 'New Providence']].map(([label, val, setter, ph]) => (
        <View key={label as string}>
          <Text style={s.label}>{label as string}</Text>
          <TextInput style={s.input} value={val as string} onChangeText={setter as any} placeholder={ph as string} placeholderTextColor='#9ca3af' />
        </View>
      ))}
      <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]} onPress={handleAdd} disabled={loading}>
        {loading ? <ActivityIndicator color='#fff' /> : <Text style={s.btnText}>Add property</Text>}
      </TouchableOpacity>
    </ScrollView>
  )
}
export default AddPropertyScreen
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' }, inner: { padding: 24, paddingTop: 60, gap: 10 },
  back: { marginBottom: 8 }, backText: { color: '#1a56db', fontSize: 15 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb' },
  btn: { backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' }, error: { color: '#ef4444', fontSize: 13 },
})