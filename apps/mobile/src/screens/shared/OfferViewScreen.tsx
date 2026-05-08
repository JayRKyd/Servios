import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, SafeAreaView,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useAuth } from '@/store/store'

const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  sent:     { bg: '#eff6ff', text: '#1d4ed8' },
  accepted: { bg: '#f0fdf4', text: '#15803d' },
  declined: { bg: '#fef2f2', text: '#b91c1c' },
}

export function OfferViewScreen() {
  const params = useLocalSearchParams<{ conversationId: string; offerId: string }>()
  const { user, session } = useAuth()

  const [offer, setOffer]     = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing]   = useState<'accept' | 'decline' | null>(null)

  const activeRole = user?.user_metadata?.active_role as string | undefined
  const isCustomer = activeRole === 'customer'
  const isProvider = activeRole === 'provider'

  useEffect(() => {
    async function load() {
      const res = await fetch(
        `${API}/api/v1/conversations/${params.conversationId}/offers/${params.offerId}`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } },
      )
      if (res.ok) {
        const data = await res.json()
        setOffer(data.offer)
      }
      setLoading(false)
    }
    load()
  }, [params.offerId])

  async function handleAction(action: 'accept' | 'decline') {
    setActing(action)
    try {
      const res = await fetch(
        `${API}/api/v1/conversations/${params.conversationId}/offers/${params.offerId}/${action}`,
        { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token}` } },
      )
      if (res.ok) {
        setOffer((prev: any) => ({ ...prev, status: action === 'accept' ? 'accepted' : 'declined' }))
        setTimeout(() => router.back(), 1000)
      } else {
        const data = await res.json().catch(() => ({}))
        Alert.alert('Error', data.message ?? `Could not ${action} offer`)
      }
    } catch {
      Alert.alert('Error', 'Something went wrong')
    } finally {
      setActing(null)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={s.centered}>
        <ActivityIndicator color="#1a56db" size="large" />
      </SafeAreaView>
    )
  }

  if (!offer) {
    return (
      <SafeAreaView style={s.centered}>
        <Text style={s.notFound}>Offer not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backLink}>← Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const milestones: any[] = offer.milestones ?? []
  const sc = STATUS_COLOR[offer.status] ?? STATUS_COLOR.sent
  const isPending = offer.status === 'sent'

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} style={s.backRow}>
          <Text style={s.backText}>← Back to chat</Text>
        </TouchableOpacity>

        {/* Offer header */}
        <View style={s.headerCard}>
          <View style={s.headerTop}>
            <View style={s.headerLeft}>
              <Text style={s.offerLabel}>
                Offer {offer.version > 1 ? `(v${offer.version})` : ''}
              </Text>
              <Text style={s.offerTitle}>{offer.title}</Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
              <Text style={[s.statusText, { color: sc.text }]}>{offer.status}</Text>
            </View>
          </View>
          {offer.description && <Text style={s.offerDesc}>{offer.description}</Text>}
        </View>

        {/* Milestones */}
        <View style={s.milestonesCard}>
          <Text style={s.sectionTitle}>Milestones</Text>

          {milestones.map((m: any, i: number) => (
            <View key={i} style={[s.milestoneRow, i < milestones.length - 1 && s.milestoneRowBorder]}>
              <View style={s.milestoneNum}>
                <Text style={s.milestoneNumText}>{i + 1}</Text>
              </View>
              <View style={s.milestoneBody}>
                <Text style={s.milestoneTitle}>{m.title}</Text>
                {m.description && <Text style={s.milestoneDesc}>{m.description}</Text>}
                {m.due_date && <Text style={s.milestoneDate}>Due {m.due_date}</Text>}
              </View>
              <Text style={s.milestoneAmount}>${(m.amount_cents / 100).toFixed(2)}</Text>
            </View>
          ))}

          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalAmount}>${(offer.total_cents / 100).toFixed(2)}</Text>
          </View>
        </View>

        {/* Customer actions */}
        {isCustomer && isPending && (
          <View style={s.actions}>
            <TouchableOpacity
              style={[s.declineBtn, acting && { opacity: 0.6 }]}
              onPress={() => handleAction('decline')}
              disabled={!!acting}
            >
              {acting === 'decline'
                ? <ActivityIndicator color="#ef4444" />
                : <Text style={s.declineBtnText}>Decline</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.acceptBtn, acting && { opacity: 0.6 }]}
              onPress={() => handleAction('accept')}
              disabled={!!acting}
            >
              {acting === 'accept'
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.acceptBtnText}>✓ Accept Offer</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Status banners */}
        {offer.status === 'accepted' && (
          <View style={s.acceptedBanner}>
            <Text style={s.acceptedBannerText}>✅ Offer accepted — contract is active</Text>
          </View>
        )}
        {offer.status === 'declined' && (
          <View style={s.declinedBanner}>
            <Text style={s.declinedBannerText}>This offer was declined.</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

export default OfferViewScreen

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#f9fafb' },
  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFound:     { fontSize: 16, color: '#6b7280' },
  backLink:     { fontSize: 15, color: '#1a56db', marginTop: 8 },
  backRow:      { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  backText:     { fontSize: 15, color: '#1a56db', fontWeight: '500' },

  headerCard:   { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  headerTop:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  headerLeft:   { flex: 1 },
  offerLabel:   { fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 },
  offerTitle:   { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 2 },
  statusBadge:  { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText:   { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  offerDesc:    { fontSize: 14, color: '#6b7280', lineHeight: 20 },

  milestonesCard:{ backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  milestoneRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  milestoneRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  milestoneNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  milestoneNumText: { fontSize: 11, fontWeight: '700', color: '#1a56db' },
  milestoneBody:{ flex: 1 },
  milestoneTitle:{ fontSize: 14, fontWeight: '600', color: '#111827' },
  milestoneDesc:{ fontSize: 12, color: '#6b7280', marginTop: 2 },
  milestoneDate:{ fontSize: 11, color: '#9ca3af', marginTop: 2 },
  milestoneAmount: { fontSize: 15, fontWeight: '700', color: '#111827', flexShrink: 0 },
  totalRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#f3f4f6', backgroundColor: '#f9fafb' },
  totalLabel:   { fontSize: 15, fontWeight: '700', color: '#374151' },
  totalAmount:  { fontSize: 18, fontWeight: '800', color: '#111827' },

  actions:      { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 12 },
  declineBtn:   { flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  declineBtnText:{ fontSize: 15, fontWeight: '600', color: '#6b7280' },
  acceptBtn:    { flex: 2, backgroundColor: '#1a56db', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  acceptBtnText:{ fontSize: 15, fontWeight: '700', color: '#fff' },

  acceptedBanner: { backgroundColor: '#f0fdf4', marginHorizontal: 16, borderRadius: 12, padding: 14, alignItems: 'center' },
  acceptedBannerText: { fontSize: 14, fontWeight: '600', color: '#15803d' },
  declinedBanner: { backgroundColor: '#fef2f2', marginHorizontal: 16, borderRadius: 12, padding: 14, alignItems: 'center' },
  declinedBannerText: { fontSize: 14, color: '#b91c1c' },
})
