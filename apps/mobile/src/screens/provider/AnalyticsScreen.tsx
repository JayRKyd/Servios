import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/store'

const PERIODS = ['7d', '30d', '90d', 'all'] as const
type Period = typeof PERIODS[number]

interface Stats {
  totalEarned: number
  completedJobs: number
  avgJobValue: number
  avgRating: number
  reviewCount: number
  repeatCustomers: number
  byMonth: { month: string; earned: number; jobs: number }[]
  topServices: { name: string; count: number }[]
}

function fmt(cents: number) { return `£${(cents / 100).toFixed(0)}` }
function fmtFull(cents: number) { return `£${(cents / 100).toFixed(2)}` }

function periodLabel(p: Period) {
  return { '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days', all: 'All time' }[p]
}

function periodFrom(p: Period): string | null {
  if (p === 'all') return null
  const d = new Date()
  d.setDate(d.getDate() - parseInt(p))
  return d.toISOString()
}

export function AnalyticsScreen() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<Period>('30d')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user) return
      setLoading(true)
      const from = periodFrom(period)

      let bookingsQ = supabase
        .from('bookings')
        .select('id, total_amount, completed_at, customer_id, service:services(title)')
        .eq('provider_id', user.id)
        .eq('status', 'completed')

      if (from) bookingsQ = bookingsQ.gte('completed_at', from)

      const [{ data: bookings }, { data: reviews }] = await Promise.all([
        bookingsQ,
        supabase
          .from('reviews')
          .select('rating')
          .eq('provider_id', user.id)
          .then(r => {
            if (from) return supabase.from('reviews').select('rating').eq('provider_id', user.id).gte('created_at', from)
            return r
          }),
      ])

      const bks = bookings ?? []
      const rvs = reviews ?? []

      const totalEarned = bks.reduce((s, b) => s + (b.total_amount ?? 0), 0)
      const completedJobs = bks.length
      const avgJobValue = completedJobs > 0 ? totalEarned / completedJobs : 0

      const avgRating = rvs.length > 0
        ? rvs.reduce((s: number, r: any) => s + r.rating, 0) / rvs.length
        : 0

      // Repeat customers
      const customerCounts: Record<string, number> = {}
      bks.forEach(b => { customerCounts[b.customer_id] = (customerCounts[b.customer_id] ?? 0) + 1 })
      const repeatCustomers = Object.values(customerCounts).filter(c => c > 1).length

      // By month (last 6 months)
      const monthMap: Record<string, { earned: number; jobs: number }> = {}
      bks.forEach(b => {
        if (!b.completed_at) return
        const key = b.completed_at.slice(0, 7) // YYYY-MM
        if (!monthMap[key]) monthMap[key] = { earned: 0, jobs: 0 }
        monthMap[key].earned += b.total_amount ?? 0
        monthMap[key].jobs += 1
      })
      const byMonth = Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, v]) => ({
          month: new Date(month + '-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
          ...v,
        }))

      // Top services
      const serviceMap: Record<string, number> = {}
      bks.forEach(b => {
        const name = (b.service as any)?.title ?? 'Other'
        serviceMap[name] = (serviceMap[name] ?? 0) + 1
      })
      const topServices = Object.entries(serviceMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }))

      setStats({ totalEarned, completedJobs, avgJobValue, avgRating, reviewCount: rvs.length, repeatCustomers, byMonth, topServices })
      setLoading(false)
    }
    load()
  }, [user, period])

  const maxMonthEarned = Math.max(...(stats?.byMonth.map(m => m.earned) ?? [1]))

  return (
    <ScrollView style={s.container} contentContainerStyle={s.inner} showsVerticalScrollIndicator={false}>
      <Text style={s.title}>Analytics</Text>

      {/* Period selector */}
      <View style={s.periods}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p}
            style={[s.periodChip, period === p && s.periodChipActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[s.periodText, period === p && s.periodTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading || !stats ? (
        <View style={s.center}><ActivityIndicator color="#1a56db" /></View>
      ) : (
        <>
          {/* KPI cards */}
          <View style={s.kpiGrid}>
            <KpiCard label="Total Earned" value={fmtFull(stats.totalEarned)} sub={periodLabel(period)} color="#1a56db" />
            <KpiCard label="Jobs Done" value={String(stats.completedJobs)} sub="completed" color="#16a34a" />
            <KpiCard label="Avg Job Value" value={fmtFull(stats.avgJobValue)} sub="per booking" color="#7c3aed" />
            <KpiCard
              label="Avg Rating"
              value={stats.reviewCount > 0 ? `${stats.avgRating.toFixed(1)} ⭐` : '—'}
              sub={`${stats.reviewCount} review${stats.reviewCount !== 1 ? 's' : ''}`}
              color="#f59e0b"
            />
            <KpiCard label="Repeat Clients" value={String(stats.repeatCustomers)} sub="booked 2+ times" color="#0891b2" />
          </View>

          {/* Earnings bar chart */}
          {stats.byMonth.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Monthly Earnings</Text>
              <View style={s.bars}>
                {stats.byMonth.map(m => (
                  <View key={m.month} style={s.barCol}>
                    <Text style={s.barValue}>{fmt(m.earned)}</Text>
                    <View style={s.barTrack}>
                      <View
                        style={[
                          s.bar,
                          { height: Math.max(4, (m.earned / maxMonthEarned) * 100) },
                        ]}
                      />
                    </View>
                    <Text style={s.barLabel}>{m.month}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Top services */}
          {stats.topServices.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Top Services</Text>
              {stats.topServices.map((svc, i) => (
                <View key={svc.name} style={s.serviceRow}>
                  <Text style={s.serviceRank}>#{i + 1}</Text>
                  <Text style={s.serviceName} numberOfLines={1}>{svc.name}</Text>
                  <Text style={s.serviceCount}>{svc.count} job{svc.count !== 1 ? 's' : ''}</Text>
                </View>
              ))}
            </View>
          )}

          {stats.completedJobs === 0 && (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📊</Text>
              <Text style={s.emptyTitle}>No data yet</Text>
              <Text style={s.emptySub}>Complete your first jobs to see analytics here.</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  )
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <View style={[ks.card, { borderLeftColor: color }]}>
      <Text style={ks.value}>{value}</Text>
      <Text style={ks.label}>{label}</Text>
      <Text style={ks.sub}>{sub}</Text>
    </View>
  )
}

export default AnalyticsScreen

const ks = StyleSheet.create({
  card:  { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 14, padding: 14, borderLeftWidth: 3, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  value: { fontSize: 20, fontWeight: '800', color: '#111827' },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginTop: 2 },
  sub:   { fontSize: 11, color: '#9ca3af', marginTop: 1 },
})

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f9fafb' },
  inner:           { padding: 20, paddingBottom: 40 },
  title:           { fontSize: 24, fontWeight: '700', color: '#111827', paddingTop: 56, marginBottom: 16 },
  center:          { height: 200, alignItems: 'center', justifyContent: 'center' },
  periods:         { flexDirection: 'row', gap: 8, marginBottom: 20 },
  periodChip:      { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  periodChipActive:{ backgroundColor: '#1a56db', borderColor: '#1a56db' },
  periodText:      { fontSize: 13, color: '#374151', fontWeight: '500' },
  periodTextActive:{ color: '#fff', fontWeight: '700' },
  kpiGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  card:            { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardTitle:       { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 14 },
  bars:            { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 140 },
  barCol:          { flex: 1, alignItems: 'center', gap: 4 },
  barValue:        { fontSize: 9, color: '#6b7280', fontWeight: '600' },
  barTrack:        { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar:             { backgroundColor: '#1a56db', borderRadius: 4, width: '100%' },
  barLabel:        { fontSize: 9, color: '#9ca3af' },
  serviceRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  serviceRank:     { fontSize: 13, fontWeight: '700', color: '#9ca3af', width: 24 },
  serviceName:     { flex: 1, fontSize: 14, color: '#111827' },
  serviceCount:    { fontSize: 13, color: '#6b7280' },
  empty:           { alignItems: 'center', gap: 10, paddingVertical: 40 },
  emptyIcon:       { fontSize: 48 },
  emptyTitle:      { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptySub:        { fontSize: 14, color: '#6b7280', textAlign: 'center' },
})
