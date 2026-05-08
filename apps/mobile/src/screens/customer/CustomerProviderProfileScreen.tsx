import { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, SafeAreaView,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'

interface ProviderProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  business_name: string | null
  bio: string | null
  trade_category: string | null
  hourly_rate: number | null
  rating_average: number
  total_reviews: number
  verification_status: string
  service_areas: string[] | null
}

interface Review {
  rating: number
  review_text: string | null
}

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating)
  return (
    <Text style={{ color: '#f59e0b', fontSize: 16 }}>
      {'★'.repeat(full)}{'☆'.repeat(5 - full)}
    </Text>
  )
}

export function CustomerProviderProfileScreen() {
  const params = useLocalSearchParams<{ id: string; context?: string }>()
  const [profile, setProfile] = useState<ProviderProfile | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: pp }, { data: revs }] = await Promise.all([
        supabase
          .from('provider_profiles')
          .select('id, user_id, first_name, last_name, business_name, bio, trade_category, hourly_rate, rating_average, total_reviews, verification_status, service_areas')
          .eq('user_id', params.id)
          .single(),
        supabase
          .from('reviews')
          .select('rating, review_text')
          .eq('reviewee_id', params.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ])
      setProfile(pp ?? null)
      setReviews(revs ?? [])
      setLoading(false)
    }
    if (params.id) load()
  }, [params.id])

  if (loading) {
    return (
      <SafeAreaView style={s.centered}>
        <ActivityIndicator color="#1a56db" size="large" />
      </SafeAreaView>
    )
  }

  if (!profile) {
    return (
      <SafeAreaView style={s.centered}>
        <Text style={s.notFoundText}>Provider not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backLink}>← Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const displayName = profile.business_name ?? `${profile.first_name} ${profile.last_name}`
  const bookingHref = `/(tabs)/bookings/new?provider=${profile.user_id}${params.context ? `&context=${params.context}` : ''}`

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Back button */}
        <TouchableOpacity onPress={() => router.back()} style={s.backRow}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>

        {/* ── Hero card ─────────────────────────────────────── */}
        <View style={s.heroCard}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>

          <View style={s.heroInfo}>
            <View style={s.nameRow}>
              <Text style={s.name} numberOfLines={1}>{displayName}</Text>
              {profile.verification_status === 'verified' && (
                <View style={s.verifiedBadge}>
                  <Text style={s.verifiedText}>✓ Verified</Text>
                </View>
              )}
            </View>

            {profile.trade_category && (
              <Text style={s.tradeCategory}>
                {profile.trade_category.replace(/_/g, ' ')}
              </Text>
            )}

            <View style={s.ratingRow}>
              <Stars rating={profile.rating_average} />
              <Text style={s.ratingText}>
                {' '}{profile.rating_average?.toFixed(1)} ({profile.total_reviews} reviews)
              </Text>
            </View>

            {profile.hourly_rate != null && (
              <Text style={s.rate}>${profile.hourly_rate}/hr</Text>
            )}
          </View>
        </View>

        {/* ── Bio ─────────────────────────────────────────────── */}
        {profile.bio && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>About</Text>
            <Text style={s.bioText}>{profile.bio}</Text>
          </View>
        )}

        {/* ── Service areas ───────────────────────────────────── */}
        {profile.service_areas && profile.service_areas.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Service Areas</Text>
            <View style={s.chips}>
              {profile.service_areas.map((area) => (
                <View key={area} style={s.chip}>
                  <Text style={s.chipText}>📍 {area}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Reviews ─────────────────────────────────────────── */}
        {reviews.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Reviews</Text>
            {reviews.map((r, i) => (
              <View key={i} style={s.reviewCard}>
                <View style={s.reviewHeader}>
                  <Text style={s.reviewerName}>Customer</Text>
                  <Stars rating={r.rating} />
                </View>
                {r.review_text && <Text style={s.reviewText}>{r.review_text}</Text>}
              </View>
            ))}
          </View>
        )}

        <View style={s.bookBtnWrapper}>
          <TouchableOpacity
            style={s.bookBtn}
            onPress={() => router.push(bookingHref as any)}
          >
            <Text style={s.bookBtnText}>Book this Provider</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default CustomerProviderProfileScreen

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontSize: 16, color: '#6b7280' },
  backLink: { fontSize: 15, color: '#1a56db' },

  backRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  backText: { fontSize: 15, color: '#1a56db', fontWeight: '500' },

  heroCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1a56db',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitial: { fontSize: 28, fontWeight: '700', color: '#fff' },
  heroInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 18, fontWeight: '700', color: '#111827', flexShrink: 1 },
  verifiedBadge: { borderRadius: 20, backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3 },
  verifiedText: { fontSize: 11, fontWeight: '600', color: '#166534' },
  tradeCategory: { fontSize: 13, color: '#6b7280', textTransform: 'capitalize' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  ratingText: { fontSize: 12, color: '#6b7280' },
  rate: { fontSize: 16, fontWeight: '700', color: '#1a56db', marginTop: 4 },

  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  bioText: { fontSize: 14, color: '#4b5563', lineHeight: 22 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 20, backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 13, color: '#1a56db', fontWeight: '500' },

  reviewCard: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12, marginTop: 12 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewerName: { fontSize: 13, fontWeight: '600', color: '#374151' },
  reviewText: { fontSize: 13, color: '#6b7280', lineHeight: 20 },

  bookBtnWrapper: { margin: 16, marginTop: 4, marginBottom: 32 },
  bookBtn: { backgroundColor: '#1a56db', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
