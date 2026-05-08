import { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/store'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:      { bg: '#fef9c3', text: '#854d0e' },
  accepted:     { bg: '#dbeafe', text: '#1e40af' },
  in_progress:  { bg: '#ede9fe', text: '#6d28d9' },
  completed:    { bg: '#dcfce7', text: '#166534' },
  cancelled:    { bg: '#f3f4f6', text: '#6b7280' },
  rejected:     { bg: '#fee2e2', text: '#991b1b' },
  resolved:     { bg: '#dcfce7', text: '#166534' },
  open:         { bg: '#fee2e2', text: '#991b1b' },
}
const PRIORITY_COLORS: Record<string, string> = {
  low: '#6b7280', medium: '#1d4ed8', high: '#c2410c', emergency: '#ef4444',
}

type TabKey = 'requests' | 'bookings'

export function MaintenanceHistoryScreen() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>('requests')

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    Promise.all([
      supabase
        .from('maintenance_requests')
        .select('id, title, description, priority, status, created_at, booking:bookings(id, status, scheduled_date, provider:provider_profiles(first_name, last_name, business_name))')
        .eq('tenant_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('bookings')
        .select('id, booking_number, scheduled_date, status, service:services(title, category), provider:provider_profiles(first_name, last_name, business_name)')
        .eq('tenant_id', user.id)
        .order('created_at', { ascending: false }),
    ]).then(([{ data: reqs }, { data: bks }]) => {
      setRequests(reqs ?? [])
      setBookings(bks ?? [])
      setLoading(false)
    })
  }, [user?.id])

  if (loading) return <ActivityIndicator style={{ flex: 1, marginTop: 100 }} color="#1a56db" />

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Service History</Text>
      </View>

      {/* Tab switcher */}
      <View style={s.tabs}>
        {(['requests', 'bookings'] as TabKey[]).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabActive]}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'requests' ? 'Repair Requests' : 'Scheduled Services'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'requests' && (
        <FlatList
          data={requests}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
          ListHeaderComponent={
            <TouchableOpacity style={s.newBtn} onPress={() => router.push('/(tabs)/maintenance/new' as any)}>
              <Text style={s.newBtnText}>+ Report New Issue</Text>
            </TouchableOpacity>
          }
          ListEmptyComponent={<Text style={s.emptyText}>No repair requests yet</Text>}
          renderItem={({ item: r }) => {
            const sc = STATUS_COLORS[r.status] ?? STATUS_COLORS.pending
            const booking = r.booking
            const providerName = booking?.provider?.business_name ??
              `${booking?.provider?.first_name ?? ''} ${booking?.provider?.last_name ?? ''}`.trim()
            return (
              <View style={s.card}>
                <View style={s.cardTop}>
                  <View style={{ flex: 1 }}>
                    <View style={s.titleRow}>
                      <Text style={s.cardTitle} numberOfLines={1}>{r.title}</Text>
                      <Text style={[s.priority, { color: PRIORITY_COLORS[r.priority] ?? '#6b7280' }]}>
                        {r.priority}
                      </Text>
                    </View>
                    {r.description ? (
                      <Text style={s.desc} numberOfLines={2}>{r.description}</Text>
                    ) : null}
                    <Text style={s.date}>{r.created_at?.slice(0, 10)}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: sc.bg }]}>
                    <Text style={[s.badgeText, { color: sc.text }]}>{r.status.replace('_', ' ')}</Text>
                  </View>
                </View>
                {booking && providerName ? (
                  <View style={s.providerRow}>
                    <Text style={s.providerLabel}>Provider: </Text>
                    <Text style={s.providerName}>{providerName} · {booking.scheduled_date}</Text>
                  </View>
                ) : null}
              </View>
            )
          }}
        />
      )}

      {tab === 'bookings' && (
        <FlatList
          data={bookings}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
          ListEmptyComponent={<Text style={s.emptyText}>No bookings yet</Text>}
          renderItem={({ item: b }) => {
            const sc = STATUS_COLORS[b.status] ?? STATUS_COLORS.pending
            const provider = b.provider
            const providerName = provider?.business_name ??
              `${provider?.first_name ?? ''} ${provider?.last_name ?? ''}`.trim() || 'Unknown provider'
            return (
              <View style={s.card}>
                <View style={s.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle} numberOfLines={1}>{b.service?.title ?? b.booking_number}</Text>
                    <Text style={s.providerName}>{providerName}</Text>
                    <Text style={s.date}>{b.scheduled_date}</Text>
                    {/* Cost is intentionally not shown for tenants */}
                  </View>
                  <View style={[s.badge, { backgroundColor: sc.bg }]}>
                    <Text style={[s.badgeText, { color: sc.text }]}>{b.status.replace('_', ' ')}</Text>
                  </View>
                </View>
              </View>
            )
          }}
        />
      )}
    </View>
  )
}

export default MaintenanceHistoryScreen

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f9fafb' },
  topBar:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  back:         { color: '#1a56db', fontSize: 15 },
  title:        { fontSize: 20, fontWeight: '700', color: '#111827' },
  tabs:         { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tab:          { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:    { borderBottomColor: '#1a56db' },
  tabText:      { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  tabTextActive:{ color: '#1a56db', fontWeight: '700' },
  newBtn:       { backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 11, alignItems: 'center', marginBottom: 8 },
  newBtnText:   { color: '#fff', fontWeight: '600', fontSize: 14 },
  card:         { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardTop:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  titleRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardTitle:    { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  priority:     { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  desc:         { fontSize: 13, color: '#6b7280', marginTop: 2, lineHeight: 18 },
  date:         { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  badge:        { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText:    { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  providerRow:  { flexDirection: 'row', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  providerLabel:{ fontSize: 12, color: '#9ca3af' },
  providerName: { fontSize: 12, color: '#374151', flex: 1 },
  emptyText:    { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 14 },
})
