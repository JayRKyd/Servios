import { useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useAuth, useBookings } from '@/store/store'
export function ProviderHomeScreen() {
  const { user } = useAuth()
  const { bookings, isLoading, fetchBookings } = useBookings()
  useEffect(() => { fetchBookings({ status: 'pending' }) }, [])
  const name = user?.provider_profiles?.[0]?.first_name ?? 'Provider'
  const pending = bookings.filter(b => b.status === 'pending')
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.greeting}>Hi, {name}</Text>
        <Text style={s.sub}>{pending.length} pending request{pending.length !== 1 ? 's' : ''}</Text>
      </View>
      <View style={s.actions}>
        {([['📋','Requests','/(tabs)/bookings'],['📅','Calendar','/(tabs)/calendar'],['💰','Earnings','/(tabs)/earnings'],['💬','Messages','/(tabs)/messages']] as const).map(([icon,label,route]) => (
          <TouchableOpacity key={label} style={s.actionBtn} onPress={() => router.push(route as any)}>
            <Text style={s.actionIcon}>{icon}</Text><Text style={s.actionLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.section}>Pending Requests</Text>
      {isLoading ? <ActivityIndicator color='#1a56db' style={{ marginTop: 16 }} /> : (
        <FlatList data={pending} keyExtractor={i => i.id}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          ListEmptyComponent={<Text style={s.empty}>No pending requests</Text>}
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
export default ProviderHomeScreen
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#1a56db', padding: 24, paddingTop: 60 },
  greeting: { fontSize: 24, fontWeight: '700', color: '#fff' },
  sub: { fontSize: 14, color: '#bfdbfe', marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 10 },
  actionBtn: { width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', gap: 6, elevation: 1 },
  actionIcon: { fontSize: 24 }, actionLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
  section: { fontSize: 16, fontWeight: '700', color: '#111827', paddingHorizontal: 16, marginBottom: 8 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 24 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 1 },
  cardNum: { fontSize: 14, fontWeight: '600', color: '#111827' },
  cardDate: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  cardAmt: { fontSize: 14, fontWeight: '600', color: '#1a56db', marginTop: 4 },
})