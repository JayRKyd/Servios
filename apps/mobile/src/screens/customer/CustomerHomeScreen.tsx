import { useEffect } from 'react'
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { useAuth, useBookings, useRole } from '@/store/store'
import { CATEGORY_META } from '@/lib/service-questions'

// Show these 8 categories in the home grid
const HOME_CATEGORIES = [
  'plumber', 'electrician', 'cleaner', 'hvac',
  'painter', 'handyman', 'landscaper', 'roofer',
]

export function CustomerHomeScreen() {
  const { user } = useAuth()
  const { activeRole } = useRole()
  const { bookings, isLoading, fetchBookings } = useBookings()

  useEffect(() => { fetchBookings({ status: 'accepted' }) }, [])

  const firstName = user?.customer_profiles?.[0]?.first_name ?? user?.email?.split('@')[0] ?? 'there'
  const upcoming = bookings.filter(b => b.status === 'accepted' || b.status === 'pending').slice(0, 3)

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      {/* ── Hero header ─────────────────────────────────────── */}
      <View style={s.hero}>
        <Text style={s.greeting}>Hi, {firstName} 👋</Text>
        <Text style={s.heroSub}>What do you need help with today?</Text>
      </View>

      {/* ── Category grid ───────────────────────────────────── */}
      <View style={s.section}>
        <View style={s.grid}>
          {HOME_CATEGORIES.map((key) => {
            const meta = CATEGORY_META[key]
            return (
              <TouchableOpacity
                key={key}
                style={[s.catCard, { backgroundColor: meta.color }]}
                onPress={() => router.push((`/book?category=${key}`) as any)}
                activeOpacity={0.7}
              >
                <Text style={s.catIcon}>{meta.icon}</Text>
                <Text style={s.catLabel}>{meta.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <TouchableOpacity
          style={s.allServicesBtn}
          onPress={() => router.push('/(tabs)/search' as any)}
        >
          <Text style={s.allServicesBtnText}>Browse all providers →</Text>
        </TouchableOpacity>
      </View>

      {/* ── Upcoming bookings ───────────────────────────────── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Upcoming bookings</Text>

        {isLoading ? (
          <ActivityIndicator color="#1a56db" style={{ marginTop: 16 }} />
        ) : upcoming.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={s.emptyTitle}>No upcoming bookings</Text>
            <Text style={s.emptySub}>Book a service above to get started</Text>
          </View>
        ) : (
          upcoming.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={s.bookingCard}
              onPress={() => router.push(`/(tabs)/bookings/${item.id}` as any)}
            >
              <View style={s.bookingCardLeft}>
                <Text style={s.bookingNumber}>{item.booking_number}</Text>
                <Text style={s.bookingDate}>{item.scheduled_date} · {item.scheduled_time_start}</Text>
              </View>
              <View style={[
                s.statusBadge,
                { backgroundColor: item.status === 'accepted' ? '#dcfce7' : '#fef9c3' },
              ]}>
                <Text style={[
                  s.statusText,
                  { color: item.status === 'accepted' ? '#166534' : '#854d0e' },
                ]}>
                  {item.status}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  )
}

export default CustomerHomeScreen

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  hero: {
    backgroundColor: '#1a56db',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 28,
  },
  greeting: { fontSize: 26, fontWeight: '700', color: '#fff' },
  heroSub: { fontSize: 14, color: '#bfdbfe', marginTop: 4 },

  section: { paddingHorizontal: 16, paddingTop: 20 },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catCard: {
    width: '47%',
    borderRadius: 14,
    padding: 16,
    alignItems: 'flex-start',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  catIcon: { fontSize: 28 },
  catLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },

  allServicesBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  allServicesBtnText: { fontSize: 14, color: '#1a56db', fontWeight: '600' },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },

  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#374151' },
  emptySub: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },

  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  bookingCardLeft: { gap: 3 },
  bookingNumber: { fontSize: 14, fontWeight: '600', color: '#111827' },
  bookingDate: { fontSize: 12, color: '#6b7280' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
})
