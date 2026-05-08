import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/store'

interface QuoteRequest {
  id: string
  title: string
  description: string | null
  status: string
  scheduled_date: string | null
  created_at: string
  response_count: number
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  open:     { bg: '#dbeafe', text: '#1d4ed8', label: 'Open' },
  closed:   { bg: '#dcfce7', text: '#15803d', label: 'Closed' },
  expired:  { bg: '#f3f4f6', text: '#6b7280', label: 'Expired' },
}

const FILTERS = ['all', 'open', 'closed', 'expired'] as const

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function QuotesScreen() {
  const { user } = useAuth()
  const [quotes, setQuotes] = useState<QuoteRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<typeof FILTERS[number]>('all')

  async function fetchQuotes() {
    if (!user) return
    const { data: props } = await supabase
      .from('properties').select('id').eq('landlord_id', user.id)
    if (!props?.length) { setQuotes([]); return }

    let q = supabase
      .from('quote_requests')
      .select('id, title, description, status, scheduled_date, created_at, quote_responses(count)')
      .in('property_id', props.map(p => p.id))
      .order('created_at', { ascending: false })

    if (filter !== 'all') q = q.eq('status', filter)

    const { data } = await q
    setQuotes(
      (data ?? []).map((r: any) => ({
        ...r,
        response_count: r.quote_responses?.[0]?.count ?? 0,
      }))
    )
  }

  useEffect(() => {
    fetchQuotes().finally(() => setLoading(false))
  }, [user, filter])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchQuotes()
    setRefreshing(false)
  }

  if (loading) return <View style={s.center}><ActivityIndicator color="#7c3aed" /></View>

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Quote Requests</Text>
        <TouchableOpacity style={s.newBtn} onPress={() => router.push('/(tabs)/quotes/new' as any)}>
          <Text style={s.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <View style={s.chips}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[s.chip, filter === f && s.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.chipText, filter === f && s.chipTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={quotes}
        keyExtractor={q => q.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#7c3aed" />}
        contentContainerStyle={quotes.length === 0 ? s.emptyContainer : s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={s.emptyTitle}>No quote requests</Text>
            <Text style={s.emptySub}>Request quotes from multiple providers to compare prices for big jobs.</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/(tabs)/quotes/new' as any)}>
              <Text style={s.emptyBtnText}>Create Quote Request</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item: q }) => {
          const st = STATUS_STYLE[q.status] ?? STATUS_STYLE.open
          return (
            <TouchableOpacity
              style={s.card}
              onPress={() => router.push(`/(tabs)/quotes/${q.id}` as any)}
              activeOpacity={0.7}
            >
              <View style={s.cardTop}>
                <Text style={s.cardTitle} numberOfLines={1}>{q.title}</Text>
                <View style={[s.badge, { backgroundColor: st.bg }]}>
                  <Text style={[s.badgeText, { color: st.text }]}>{st.label}</Text>
                </View>
              </View>
              {q.description && <Text style={s.cardDesc} numberOfLines={2}>{q.description}</Text>}
              <View style={s.cardMeta}>
                <Text style={s.metaText}>
                  💬 {q.response_count} response{q.response_count !== 1 ? 's' : ''}
                </Text>
                {q.scheduled_date && <Text style={s.metaText}>📅 {fmt(q.scheduled_date)}</Text>}
                <Text style={s.metaText}>🕐 {fmt(q.created_at)}</Text>
              </View>
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}

export default QuotesScreen

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f9fafb' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  title:        { fontSize: 24, fontWeight: '700', color: '#111827' },
  newBtn:       { backgroundColor: '#7c3aed', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  newBtnText:   { color: '#fff', fontWeight: '700', fontSize: 13 },
  chips:        { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  chip:         { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  chipActive:   { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  chipText:     { fontSize: 13, color: '#374151' },
  chipTextActive:{ color: '#fff', fontWeight: '600' },
  list:         { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  emptyContainer:{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  empty:        { alignItems: 'center', gap: 10 },
  emptyIcon:    { fontSize: 48 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptySub:     { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  emptyBtn:     { marginTop: 8, backgroundColor: '#7c3aed', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card:         { backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 6, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardTop:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle:    { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
  badge:        { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:    { fontSize: 11, fontWeight: '700' },
  cardDesc:     { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  cardMeta:     { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metaText:     { fontSize: 12, color: '#9ca3af' },
})
