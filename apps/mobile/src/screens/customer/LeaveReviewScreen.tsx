import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { apiRequest } from '@/services/api/client'
import { useAuth } from '@/store/store'

export function LeaveReviewScreen() {
  const { session } = useAuth()
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (rating === 0) { setError('Select a rating'); return }
    if (!session) return
    setError(null); setLoading(true)
    try {
      await apiRequest('/api/v1/reviews', { method: 'POST', token: session.access_token, body: JSON.stringify({ booking_id: bookingId, rating, comment }) })
      router.back()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <View style={s.container}>
      <TouchableOpacity onPress={() => router.back()} style={s.back}><Text style={s.backText}>Back</Text></TouchableOpacity>
      <Text style={s.title}>Leave a review</Text>
      <Text style={s.label}>Rating</Text>
      <View style={s.stars}>
        {[1,2,3,4,5].map(n => (
          <TouchableOpacity key={n} onPress={() => setRating(n)}>
            <Text style={{ fontSize: 36, color: n <= rating ? '#f59e0b' : '#d1d5db' }}>{n <= rating ? '★' : '☆'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.label}>Comment (optional)</Text>
      <TextInput style={[s.input, s.textarea]} value={comment} onChangeText={setComment} placeholder='Share your experience' placeholderTextColor='#9ca3af' multiline />
      {error && <Text style={{ color: '#ef4444', fontSize: 13 }}>{error}</Text>}
      <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color='#fff' /> : <Text style={s.btnText}>Submit review</Text>}
      </TouchableOpacity>
    </View>
  )
}
export default LeaveReviewScreen
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: 60, gap: 14 },
  back: { marginBottom: 4 }, backText: { color: '#1a56db', fontSize: 15 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  stars: { flexDirection: 'row', gap: 8 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb' },
  textarea: { height: 120, textAlignVertical: 'top' },
  btn: { backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})