import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useBookings } from '@/store/store'
import type { BookingStatus } from '@/types'

const FILTERS: { label: string; value?: BookingStatus }[] = [
  { label: 'All' },
  { label: 'Pending', value: 'pending' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
]

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:    { bg: '#fef9c3', text: '#854d0e' },
  accepted:   { bg: '#dcfce7', text: '#166534' },
  in_progress:{ bg: '#dbeafe', text: '#1e40af' },
  completed:  { bg: '#f0fdf4', text: '#15803d' },
  rejected:   { bg: '#fee2e2', text: '#991b1b' },
  cancelled:  { bg: '#f3f4f6', text: '#6b7280' },
}

export function CustomerBookingsScreen() {
  const { bookings, isLoading, fetchBookings } = useBookings()
  const [filter, setFilter] = useState<BookingStatus | undefined>()

  useEffect(() => { fetchBookings(filter ? { status: filter } : {}) }, [filter])

  return (
    <View style={s.container}>
      <Text style={s.title}>My Bookings</Text>
      <View style={s.filters}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f.label} style={[s.filterChip, filter === f.value && s.filterActive]}
            onPress={() => setFilter(f.value)}>
            <Text style={[s.filterText, filter === f.value && s.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {isLoading
        ? <ActivityIndicator color="#1a56db" style={{ marginTop: 40 }} />
        : <FlatList
            data={bookings}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            ListEmptyComponent={<Text style={s.empty}>No bookings found</Text>}
            renderItem={({ item }) => {
              const c = STATUS_COLORS[item.status] ?? STATUS_COLORS.pending
              return (
                <TouchableOpacity style={s.card} onPress={() => router.push(`/(tabs)/bookings/${item.id}`)}>
                  <View style={s.cardRow}>
                    <Text style={s.cardNum}>{item.booking_number}</Text>
                    <View style={[s.badge, { backgroundColor: c.bg }]}>
                      <Text style={[s.badgeText, { color: c.text }]}>{item.status}</Text>
                    </View>
                  </View>
                  <Text style={s.cardDate}>{item.scheduled_date} · {item.scheduled_time_start}</Text>
                  <Text style={s.cardAmount}>USD {(item.total_amount / 100).toFixed(2)}</Text>
                </TouchableOpacity>
              )
            }}
          />
      }
    </View>
  )
}
export default CustomerBookingsScreen

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12 },
  filters: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  filterChip: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#fff' },
  filterActive: { borderColor: '#1a56db', backgroundColor: '#eff6ff' },
  filterText: { fontSize: 13, color: '#6b7280' },
  filterTextActive: { color: '#1a56db', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardNum: { fontSize: 14, fontWeight: '600', color: '#111827' },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  cardDate: { fontSize: 13, color: '#6b7280', marginTop: 6 },
  cardAmount: { fontSize: 14, fontWeight: '600', color: '#1a56db', marginTop: 4 },
})
