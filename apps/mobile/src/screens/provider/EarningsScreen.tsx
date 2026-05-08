import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native'
import { apiRequest } from '@/services/api/client'
import { useAuth } from '@/store/store'
export function EarningsScreen() {
  const { session } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!session) return
    apiRequest('/api/v1/providers/me/earnings', { token: session.access_token }).then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [])
  if (loading) return <ActivityIndicator color='#1a56db' style={{ flex: 1, marginTop: 100 }} />
  return (
    <ScrollView style={s.container} contentContainerStyle={s.inner}>
      <Text style={s.title}>Earnings</Text>
      {[['Total earned', 'USD ' + ((data?.total_earned ?? 0) / 100).toFixed(2)], ['This month', 'USD ' + ((data?.month_earned ?? 0) / 100).toFixed(2)], ['Completed bookings', String(data?.booking_count ?? 0)]].map(([l, v]) => (
        <View key={l} style={s.card}><Text style={s.cardLabel}>{l}</Text><Text style={s.cardValue}>{v}</Text></View>
      ))}
    </ScrollView>
  )
}
export default EarningsScreen
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' }, inner: { padding: 24, paddingTop: 60, gap: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, elevation: 1 },
  cardLabel: { fontSize: 13, color: '#6b7280' }, cardValue: { fontSize: 24, fontWeight: '700', color: '#1a56db', marginTop: 4 },
})