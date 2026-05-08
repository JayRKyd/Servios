import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { bookingsApi } from '@/services/api/bookings.api'
import { useAuth } from '@/store/store'

export function BookServiceScreen() {
  const { session } = useAuth()
  const params = useLocalSearchParams<{ serviceId: string; providerId: string }>()
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleBook() {
    if (!date || !time) { setError('Please enter date and time'); return }
    if (!session) return
    setError(null); setLoading(true)
    try {
      const booking = await bookingsApi.create({ service_id: params.serviceId ?? '', provider_id: params.providerId ?? '', scheduled_date: date, scheduled_time_start: time, customer_notes: notes }, session.access_token)
      router.replace('/(tabs)/bookings/' + booking.id)
    } catch (e) { setError(e instanceof Error ? e.message : 'Booking failed') }
    finally { setLoading(false) }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.inner} keyboardShouldPersistTaps='handled'>
      <TouchableOpacity onPress={() => router.back()} style={s.back}><Text style={s.backText}>Back</Text></TouchableOpacity>
      <Text style={s.title}>Book service</Text>
      {error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}
      <Text style={s.label}>Date (YYYY-MM-DD)</Text>
      <TextInput style={s.input} value={date} onChangeText={setDate} placeholder='2025-12-25' placeholderTextColor='#9ca3af' />
      <Text style={s.label}>Start time (HH:MM)</Text>
      <TextInput style={s.input} value={time} onChangeText={setTime} placeholder='09:00' placeholderTextColor='#9ca3af' />
      <Text style={s.label}>Notes</Text>
      <TextInput style={[s.input, s.textarea]} value={notes} onChangeText={setNotes} placeholder='Special instructions' placeholderTextColor='#9ca3af' multiline />
      <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleBook} disabled={loading}>
        {loading ? <ActivityIndicator color='#fff' /> : <Text style={s.btnText}>Confirm booking</Text>}
      </TouchableOpacity>
    </ScrollView>
  )
}
export default BookServiceScreen
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { padding: 24, paddingTop: 60, gap: 10 },
  back: { marginBottom: 8 }, backText: { color: '#1a56db', fontSize: 15 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb' },
  textarea: { height: 100, textAlignVertical: 'top' },
  btn: { backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 }, btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 12 },
  errorText: { color: '#ef4444', fontSize: 13 },
})