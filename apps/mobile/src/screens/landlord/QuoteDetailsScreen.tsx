import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/store'

interface QuoteResponse {
  id: string
  provider_id: string
  amount: number
  notes: string | null
  estimated_days: number | null
  created_at: string
  provider: {
    business_name: string | null
    trade_category: string | null
    rating: number | null
    users: { first_name: string | null; last_name: string | null }
  }
}

interface QuoteRequest {
  id: string
  title: string
  description: string | null
  status: string
  service_type: string | null
  scheduled_date: string | null
  created_at: string
  property: { name: string; address_line1: string } | null
  quote_responses: QuoteResponse[]
}

const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

function fmt(cents: number) { return `£${(cents / 100).toFixed(2)}` }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function QuoteDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session } = useAuth()
  const [quote, setQuote] = useState<QuoteRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)

  async function fetchQuote() {
    if (!id) return
    const { data } = await supabase
      .from('quote_requests')
      .select(`
        id, title, description, status, service_type, scheduled_date, created_at,
        property:property_id(name, address_line1),
        quote_responses(
          id, provider_id, amount, notes, estimated_days, created_at,
          provider:provider_profiles(business_name, trade_category, rating,
            users:user_id(first_name, last_name))
        )
      `)
      .eq('id', id)
      .single()

    setQuote(data as unknown as QuoteRequest)
  }

  useEffect(() => {
    fetchQuote().finally(() => setLoading(false))
  }, [id])

  async function handleAccept(responseId: string, providerId: string) {
    Alert.alert(
      'Accept Quote?',
      'This will create a booking with this provider and close the quote request.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setAccepting(responseId)
            try {
              const res = await fetch(`${API}/api/v1/quotes/${id}/accept`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${session?.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ responseId }),
              })
              if (!res.ok) throw new Error('Failed to accept quote')
              await fetchQuote()
              Alert.alert('Quote Accepted ✓', 'A booking has been created with this provider.')
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to accept quote')
            } finally {
              setAccepting(null)
            }
          },
        },
      ]
    )
  }

  if (loading) return <View style={s.center}><ActivityIndicator color="#7c3aed" /></View>
  if (!quote) return <View style={s.center}><Text style={s.empty}>Quote request not found.</Text></View>

  const responses = quote.quote_responses ?? []
  const isClosed = quote.status === 'closed'

  return (
    <ScrollView style={s.container} contentContainerStyle={s.inner}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Quote Request</Text>
      </View>

      {/* Summary */}
      <View style={s.card}>
        <Text style={s.quoteName}>{quote.title}</Text>
        {quote.description && <Text style={s.quoteDesc}>{quote.description}</Text>}
        <View style={s.metaGrid}>
          <MetaRow label="Property" value={(quote.property as any)?.name ?? (quote.property as any)?.address_line1 ?? '—'} />
          {quote.service_type && <MetaRow label="Type" value={quote.service_type} />}
          {quote.scheduled_date && <MetaRow label="Preferred Date" value={fmtDate(quote.scheduled_date)} />}
          <MetaRow label="Requested" value={fmtDate(quote.created_at)} />
          <MetaRow label="Responses" value={`${responses.length}`} />
        </View>
      </View>

      {/* Responses */}
      <Text style={s.responsesTitle}>
        {responses.length === 0 ? 'No responses yet' : `${responses.length} Quote${responses.length !== 1 ? 's' : ''} Received`}
      </Text>

      {responses.length === 0 ? (
        <View style={s.noResponses}>
          <Text style={s.noResponsesText}>Providers haven't responded yet. Check back soon.</Text>
        </View>
      ) : (
        [...responses]
          .sort((a, b) => a.amount - b.amount)
          .map((r, i) => {
            const providerName = r.provider?.business_name ?? `${r.provider?.users?.first_name} ${r.provider?.users?.last_name}`
            const isLowest = i === 0 && responses.length > 1
            return (
              <View key={r.id} style={[s.responseCard, isLowest && s.responseCardBest]}>
                {isLowest && (
                  <View style={s.bestBadge}>
                    <Text style={s.bestBadgeText}>⭐ Lowest Quote</Text>
                  </View>
                )}
                <View style={s.responseHeader}>
                  <View style={s.providerInitials}>
                    <Text style={s.providerInitialsText}>{(providerName?.[0] ?? '?').toUpperCase()}</Text>
                  </View>
                  <View style={s.providerMeta}>
                    <Text style={s.providerName}>{providerName}</Text>
                    <Text style={s.providerTrade}>{r.provider?.trade_category ?? ''}</Text>
                    {r.provider?.rating && (
                      <Text style={s.providerRating}>⭐ {r.provider.rating.toFixed(1)}</Text>
                    )}
                  </View>
                  <Text style={s.amount}>{fmt(r.amount)}</Text>
                </View>

                {r.estimated_days && (
                  <Text style={s.days}>⏱ Estimated {r.estimated_days} day{r.estimated_days !== 1 ? 's' : ''}</Text>
                )}
                {r.notes && <Text style={s.notes}>{r.notes}</Text>}
                <Text style={s.responseDate}>Submitted {fmtDate(r.created_at)}</Text>

                {!isClosed && (
                  <TouchableOpacity
                    style={[s.acceptBtn, accepting === r.id && s.dim]}
                    onPress={() => handleAccept(r.id, r.provider_id)}
                    disabled={!!accepting}
                  >
                    {accepting === r.id
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={s.acceptBtnText}>✓ Accept This Quote</Text>
                    }
                  </TouchableOpacity>
                )}
              </View>
            )
          })
      )}

      {isClosed && (
        <View style={s.closedBanner}>
          <Text style={s.closedBannerText}>✓ This quote request is closed. A booking was created.</Text>
        </View>
      )}
    </ScrollView>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.metaRow}>
      <Text style={s.metaLabel}>{label}</Text>
      <Text style={s.metaValue}>{value}</Text>
    </View>
  )
}

export default QuoteDetailsScreen

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#f9fafb' },
  inner:              { padding: 20, paddingBottom: 40 },
  center:             { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:              { fontSize: 15, color: '#6b7280' },
  topBar:             { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 36, marginBottom: 20 },
  back:               { color: '#7c3aed', fontSize: 15 },
  title:              { fontSize: 20, fontWeight: '700', color: '#111827' },
  card:               { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  quoteName:          { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  quoteDesc:          { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 12 },
  metaGrid:           { gap: 2 },
  metaRow:            { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  metaLabel:          { fontSize: 13, color: '#6b7280' },
  metaValue:          { fontSize: 13, color: '#111827', fontWeight: '500' },
  responsesTitle:     { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 },
  noResponses:        { backgroundColor: '#fff', borderRadius: 12, padding: 20, alignItems: 'center' },
  noResponsesText:    { fontSize: 14, color: '#9ca3af' },
  responseCard:       { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1, gap: 8 },
  responseCardBest:   { borderWidth: 1.5, borderColor: '#7c3aed' },
  bestBadge:          { alignSelf: 'flex-start', backgroundColor: '#f5f3ff', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  bestBadgeText:      { fontSize: 11, color: '#7c3aed', fontWeight: '700' },
  responseHeader:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  providerInitials:   { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
  providerInitialsText:{ fontSize: 16, fontWeight: '700', color: '#7c3aed' },
  providerMeta:       { flex: 1 },
  providerName:       { fontSize: 14, fontWeight: '600', color: '#111827' },
  providerTrade:      { fontSize: 12, color: '#6b7280', textTransform: 'capitalize' },
  providerRating:     { fontSize: 12, color: '#f59e0b' },
  amount:             { fontSize: 20, fontWeight: '800', color: '#111827' },
  days:               { fontSize: 13, color: '#6b7280' },
  notes:              { fontSize: 13, color: '#374151', lineHeight: 18 },
  responseDate:       { fontSize: 11, color: '#9ca3af' },
  acceptBtn:          { backgroundColor: '#7c3aed', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  acceptBtnText:      { color: '#fff', fontWeight: '700', fontSize: 14 },
  dim:                { opacity: 0.5 },
  closedBanner:       { backgroundColor: '#dcfce7', borderRadius: 12, padding: 14, marginTop: 4 },
  closedBannerText:   { color: '#15803d', fontSize: 14, fontWeight: '600' },
})
