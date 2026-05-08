import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useBookings } from '@/store/store'
export function BookingRequestsScreen() {
  const { bookings, isLoading, fetchBookings } = useBookings()
  const [filter, setFilter] = useState<string>('pending')
  useEffect(() => { fetchBookings({ status: filter as any }) }, [filter])
  return (
    <View style={s.container}>
      <Text style={s.title}>Booking Requests</Text>
      <View style={s.filters}>
        {['pending','accepted','in_progress','completed'].map(f => (
          <TouchableOpacity key={f} style={[s.chip, filter === f && s.chipActive]} onPress={() => setFilter(f)}>
            <Text style={[s.chipText, filter === f && s.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {isLoading ? <ActivityIndicator color='#1a56db' style={{ marginTop: 40 }} /> : (
        <FlatList data={bookings} keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ListEmptyComponent={<Text style={s.empty}>No bookings</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => router.push(('/(tabs)/bookings/' + item.id) as any)}>
              <Text style={s.cardNum}>{item.booking_number}</Text>
              <Text style={s.cardDate}>{item.scheduled_date} · {item.scheduled_time_start}</Text>
              <Text style={s.cardAmt}>USD {(item.total_amount / 100).toFixed(2)}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}
export default BookingRequestsScreen
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12 },
  filters: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  chip: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#fff' },
  chipActive: { borderColor: '#1a56db', backgroundColor: '#eff6ff' },
  chipText: { fontSize: 12, color: '#6b7280', textTransform: 'capitalize' },
  chipTextActive: { color: '#1a56db', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 1 },
  cardNum: { fontSize: 14, fontWeight: '600', color: '#111827' },
  cardDate: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  cardAmt: { fontSize: 14, fontWeight: '600', color: '#1a56db', marginTop: 4 },
})