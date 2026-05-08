import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:     { bg: '#fef9c3', text: '#854d0e' },
  accepted:    { bg: '#dbeafe', text: '#1e40af' },
  in_progress: { bg: '#ede9fe', text: '#6d28d9' },
  completed:   { bg: '#dcfce7', text: '#166534' },
  cancelled:   { bg: '#f3f4f6', text: '#6b7280' },
  rejected:    { bg: '#fee2e2', text: '#991b1b' },
}

interface BookingRecord {
  id: string
  booking_number: string
  scheduled_date: string
  status: string
  total_amount: number
  is_emergency: boolean
  service: { title: string; category: string } | null
  provider: { first_name: string; last_name: string; business_name: string | null } | null
  photos: { id: string }[]
}

export function PropertyHistoryScreen({ propertyId: propIdProp }: { propertyId?: string }) {
  const params = useLocalSearchParams<{ propertyId: string }>()
  const propertyId = propIdProp ?? params.propertyId
  const [bookings, setBookings] = useState<BookingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'completed' | 'in_progress' | 'pending'>('all')

  useEffect(() => {
    if (!propertyId) { setLoading(false); return }
    supabase
      .from('bookings')
      .select('id, booking_number, scheduled_date, status, total_amount, is_emergency, service:services(title, category), provider:provider_profiles(first_name, last_name, business_name), photos:booking_photos(id)')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setBookings((data as any) ?? []); setLoading(false) })
  }, [propertyId])

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)
  const totalSpend = bookings.filter(b => b.status === 'completed').reduce((s, b) => s + b.total_amount, 0)

  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'completed', label: 'Done' },
    { key: 'in_progress', label: 'Active' },
    { key: 'pending', label: 'Pending' },
  ]

  if (loading) return <ActivityIndicator style={{ flex: 1, marginTop: 100 }} color="#1a56db" />

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <Text style={s.title}>Service History</Text>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={s.stat}>
          <Text style={s.statNum}>{bookings.filter(b => b.status === 'completed').length}</Text>
          <Text style={s.statLabel}>Completed</Text>
        </View>
        <View style={s.stat}>
          <Text style={s.statNum}>{bookings.filter(b => b.status === 'in_progress').length}</Text>
          <Text style={s.statLabel}>Active</Text>
        </View>
        <View style={[s.stat, { borderRightWidth: 0 }]}>
          <Text style={[s.statNum, { color: '#1a56db' }]}>
            USD {(totalSpend / 100).toFixed(0)}
          </Text>
          <Text style={s.statLabel}>Total Spend</Text>
        </View>
      </View>

      {/* Filter chips */}
      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)}
            style={[s.filterChip, filter === f.key && s.filterChipActive]}>
            <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 10, paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={s.empty}><Text style={s.emptyText}>No bookings found</Text></View>
        }
        renderItem={({ item: b }) => {
          const sc = STATUS_COLORS[b.status] ?? STATUS_COLORS.pending
          const provider = b.provider
          const providerName = provider?.business_name ?? `${provider?.first_name ?? ''} ${provider?.last_name ?? ''}`.trim() || 'Unknown provider'
          const photoCount = b.photos?.length ?? 0
          return (
            <TouchableOpacity
              style={s.card}
              onPress={() => router.push(`/(tabs)/bookings/${b.id}` as any)}
            >
              <View style={s.cardTop}>
                <View style={s.cardInfo}>
                  <View style={s.titleRow}>
                    <Text style={s.serviceTitle} numberOfLines={1}>
                      {b.service?.title ?? b.booking_number}
                    </Text>
                    {b.is_emergency && <Text style={s.emergencyTag}>🚨</Text>}
                  </View>
                  <Text style={s.providerName}>{providerName}</Text>
                  <View style={s.metaRow}>
                    <Text style={s.metaText}>{b.scheduled_date}</Text>
                    {photoCount > 0 && <Text style={s.metaText}>📷 {photoCount}</Text>}
                  </View>
                </View>
                <View style={s.cardRight}>
                  <View style={[s.badge, { backgroundColor: sc.bg }]}>
                    <Text style={[s.badgeText, { color: sc.text }]}>{b.status.replace('_', ' ')}</Text>
                  </View>
                  <Text style={s.amount}>USD {(b.total_amount / 100).toFixed(2)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}

export default PropertyHistoryScreen

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f9fafb' },
  topBar:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  back:        { color: '#1a56db', fontSize: 15 },
  title:       { fontSize: 20, fontWeight: '700', color: '#111827' },
  statsRow:    { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  stat:        { flex: 1, alignItems: 'center', padding: 14, borderRightWidth: 1, borderRightColor: '#f3f4f6' },
  statNum:     { fontSize: 20, fontWeight: '700', color: '#111827' },
  statLabel:   { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  filterRow:   { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  filterChip:  { borderRadius: 20, borderWidth: 1.5, borderColor: '#e5e7eb', paddingHorizontal: 14, paddingVertical: 6 },
  filterChipActive: { borderColor: '#1a56db', backgroundColor: '#eff6ff' },
  filterText:  { fontSize: 13, color: '#6b7280' },
  filterTextActive: { color: '#1a56db', fontWeight: '600' },
  card:        { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardTop:     { flexDirection: 'row', alignItems: 'flex-start' },
  cardInfo:    { flex: 1 },
  titleRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  serviceTitle:{ fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  emergencyTag:{ fontSize: 14 },
  providerName:{ fontSize: 13, color: '#6b7280', marginTop: 2 },
  metaRow:     { flexDirection: 'row', gap: 10, marginTop: 6 },
  metaText:    { fontSize: 12, color: '#9ca3af' },
  cardRight:   { alignItems: 'flex-end', gap: 6 },
  badge:       { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:   { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  amount:      { fontSize: 13, fontWeight: '700', color: '#111827' },
  empty:       { alignItems: 'center', paddingTop: 40 },
  emptyText:   { color: '#9ca3af', fontSize: 14 },
})
