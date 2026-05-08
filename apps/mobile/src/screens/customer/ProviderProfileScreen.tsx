import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { apiRequest } from '@/services/api/client'
import { useAuth } from '@/store/store'

const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

interface ProviderService {
  service: { title: string; category: string }
}

interface Review {
  rating: number
  comment: string
  reviewer: { customer_profiles: { first_name: string; last_name: string }[] }
}

interface ProviderProfile {
  user_id: string
  first_name: string
  last_name: string
  business_name: string | null
  bio: string | null
  trade_category: string | null
  hourly_rate: number | null
  rating_average: number
  rating_count: number
  is_verified: boolean
  islands: string[] | null
  services: ProviderService[]
  reviews: Review[]
}

function Stars({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <Text key={n} style={{ fontSize: 16, color: n <= Math.round(rating) ? '#f59e0b' : '#d1d5db' }}>★</Text>
      ))}
    </View>
  )
}

export function ProviderProfileScreen({ providerId: propId }: { providerId?: string }) {
  const params = useLocalSearchParams<{ providerId: string }>()
  const id = propId ?? params.providerId
  const { session } = useAuth()
  const [provider, setProvider] = useState<ProviderProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id || !session?.access_token) return
    apiRequest<{ provider: ProviderProfile }>(`/api/v1/providers/${id}`, { token: session.access_token })
      .then(({ provider }) => setProvider(provider))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id, session?.access_token])

  if (loading) return <ActivityIndicator style={{ flex: 1, marginTop: 100 }} color="#1a56db" />

  if (!provider) {
    return (
      <View style={s.container}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Text style={s.backText}>← Back</Text></TouchableOpacity>
        <Text style={s.sub}>Provider not found.</Text>
      </View>
    )
  }

  const displayName = provider.business_name ?? `${provider.first_name} ${provider.last_name}`
  const uniqueCategories = [...new Set(provider.services.map(sv => sv.service.category))]

  return (
    <ScrollView style={s.container} contentContainerStyle={s.inner}>
      <TouchableOpacity onPress={() => router.back()} style={s.back}><Text style={s.backText}>← Back</Text></TouchableOpacity>

      {/* Header */}
      <View style={s.headerCard}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={s.headerInfo}>
          <View style={s.nameRow}>
            <Text style={s.name}>{displayName}</Text>
            {provider.is_verified && (
              <View style={s.verifiedBadge}><Text style={s.verifiedText}>✓ Verified</Text></View>
            )}
          </View>
          {provider.trade_category && (
            <Text style={s.trade}>{provider.trade_category.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</Text>
          )}
          <View style={s.ratingRow}>
            <Stars rating={provider.rating_average} />
            <Text style={s.ratingText}>{provider.rating_average.toFixed(1)} ({provider.rating_count} reviews)</Text>
          </View>
        </View>
      </View>

      {/* Bio */}
      {provider.bio && (
        <View style={s.card}>
          <Text style={s.sectionTitle}>About</Text>
          <Text style={s.bio}>{provider.bio}</Text>
        </View>
      )}

      {/* Details */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Details</Text>
        {provider.hourly_rate != null && (
          <View style={s.row}>
            <Text style={s.rowLabel}>Hourly rate</Text>
            <Text style={s.rowValue}>USD {provider.hourly_rate}/hr</Text>
          </View>
        )}
        {provider.islands && provider.islands.length > 0 && (
          <View style={s.row}>
            <Text style={s.rowLabel}>Serves</Text>
            <Text style={s.rowValue}>{provider.islands.join(', ')}</Text>
          </View>
        )}
        {uniqueCategories.length > 0 && (
          <View style={s.row}>
            <Text style={s.rowLabel}>Categories</Text>
            <Text style={s.rowValue}>{uniqueCategories.join(', ')}</Text>
          </View>
        )}
      </View>

      {/* Services */}
      {provider.services.length > 0 && (
        <View style={s.card}>
          <Text style={s.sectionTitle}>Services</Text>
          {provider.services.map((sv, i) => (
            <View key={i} style={s.serviceRow}>
              <Text style={s.serviceName}>{sv.service.title}</Text>
              <Text style={s.serviceCategory}>{sv.service.category}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Reviews */}
      {provider.reviews && provider.reviews.length > 0 && (
        <View style={s.card}>
          <Text style={s.sectionTitle}>Reviews</Text>
          {provider.reviews.slice(0, 5).map((rv, i) => {
            const cp = rv.reviewer?.customer_profiles?.[0]
            const reviewerName = cp ? `${cp.first_name} ${cp.last_name}` : 'Customer'
            return (
              <View key={i} style={s.reviewItem}>
                <View style={s.reviewHeader}>
                  <Text style={s.reviewerName}>{reviewerName}</Text>
                  <Stars rating={rv.rating} />
                </View>
                {rv.comment && <Text style={s.reviewComment}>{rv.comment}</Text>}
              </View>
            )
          })}
        </View>
      )}

      <TouchableOpacity
        style={s.bookBtn}
        onPress={() => router.push(`/(tabs)/bookings/new?providerId=${id}` as any)}
      >
        <Text style={s.bookBtnText}>Book this Provider</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

export default ProviderProfileScreen

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f9fafb' },
  inner:         { padding: 20, paddingTop: 56, paddingBottom: 40, gap: 14 },
  back:          { marginBottom: 4 },
  backText:      { color: '#1a56db', fontSize: 15 },
  headerCard:    { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', gap: 14, alignItems: 'flex-start', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  avatar:        { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1a56db', alignItems: 'center', justifyContent: 'center' },
  avatarText:    { color: '#fff', fontSize: 24, fontWeight: '700' },
  headerInfo:    { flex: 1, gap: 4 },
  nameRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name:          { fontSize: 18, fontWeight: '700', color: '#111827' },
  verifiedBadge: { backgroundColor: '#dcfce7', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  verifiedText:  { fontSize: 11, color: '#166534', fontWeight: '600' },
  trade:         { fontSize: 13, color: '#6b7280', textTransform: 'capitalize' },
  ratingRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  ratingText:    { fontSize: 13, color: '#6b7280' },
  card:          { backgroundColor: '#fff', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  sectionTitle:  { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 10 },
  bio:           { fontSize: 14, color: '#374151', lineHeight: 20 },
  row:           { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rowLabel:      { fontSize: 14, color: '#6b7280' },
  rowValue:      { fontSize: 14, fontWeight: '500', color: '#111827', textAlign: 'right', flex: 1, marginLeft: 12 },
  serviceRow:    { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  serviceName:   { fontSize: 14, fontWeight: '500', color: '#111827' },
  serviceCategory:{ fontSize: 12, color: '#9ca3af', marginTop: 1 },
  reviewItem:    { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  reviewHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewerName:  { fontSize: 13, fontWeight: '600', color: '#374151' },
  reviewComment: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  sub:           { fontSize: 14, color: '#6b7280' },
  bookBtn:       { backgroundColor: '#1a56db', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 6 },
  bookBtnText:   { color: '#fff', fontSize: 16, fontWeight: '700' },
})
