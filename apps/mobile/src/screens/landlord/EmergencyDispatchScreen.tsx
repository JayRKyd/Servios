import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Linking,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth, useProperties } from '@/store/store'
import { apiRequest } from '@/services/api/client'

const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

const EMERGENCY_SERVICES = [
  { label: 'Police', number: '919', color: '#1a56db' },
  { label: 'Fire', number: '911', color: '#ef4444' },
  { label: 'Ambulance', number: '919', color: '#16a34a' },
  { label: 'Bahamas Power', number: '323-7362', color: '#d97706' },
]

interface PreferredProvider {
  id: string
  provider_id: string
  notes: string | null
  provider_profiles: {
    first_name: string
    last_name: string
    business_name: string | null
    trade_category: string | null
    phone: string | null
    rating_average: number
  }
}

export function EmergencyDispatchScreen() {
  const { session, user } = useAuth()
  const { properties, fetchProperties } = useProperties()
  const [providers, setProviders] = useState<PreferredProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProperty, setSelectedProperty] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')
  const [notes, setNotes] = useState('')
  const [dispatching, setDispatching] = useState(false)

  useEffect(() => {
    fetchProperties()
    supabase
      .from('preferred_providers')
      .select('*, provider_profiles(first_name, last_name, business_name, trade_category, phone, rating_average)')
      .then(({ data }) => { setProviders((data as any) ?? []); setLoading(false) })
  }, [])

  async function handleDispatch() {
    if (!selectedProperty || !selectedProvider) {
      Alert.alert('Required', 'Select a property and provider to dispatch.')
      return
    }
    if (!session) return

    Alert.alert(
      '🚨 Confirm Emergency Dispatch',
      'This will create an emergency booking with priority response. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dispatch Now',
          style: 'destructive',
          onPress: async () => {
            setDispatching(true)
            try {
              const today = new Date().toISOString().split('T')[0]
              await apiRequest('/api/v1/bookings', {
                method: 'POST',
                token: session.access_token,
                body: JSON.stringify({
                  providerId: selectedProvider,
                  propertyId: selectedProperty,
                  landlordId: user?.id,
                  scheduledDate: today,
                  scheduledTimeStart: new Date().toTimeString().slice(0, 5),
                  baseAmount: 0,
                  serviceAddress: { street: '', city: '', island: 'New Providence' },
                  customerNotes: notes || 'Emergency dispatch via SOS',
                  isEmergency: true,
                }),
              })
              Alert.alert('✓ Dispatched', 'Emergency booking created. Provider has been notified.', [
                { text: 'OK', onPress: () => router.back() },
              ])
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Dispatch failed')
            } finally {
              setDispatching(false)
            }
          },
        },
      ],
    )
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.inner}>
      <TouchableOpacity onPress={() => router.back()} style={s.back}>
        <Text style={s.backText}>← Back</Text>
      </TouchableOpacity>

      {/* SOS Header */}
      <View style={s.sosHeader}>
        <Text style={s.sosEmoji}>🚨</Text>
        <Text style={s.sosTitle}>Emergency Dispatch</Text>
        <Text style={s.sosSub}>Quickly dispatch a provider or call emergency services</Text>
      </View>

      {/* Emergency call buttons */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Emergency Services</Text>
        <View style={s.callGrid}>
          {EMERGENCY_SERVICES.map((svc) => (
            <TouchableOpacity
              key={svc.label}
              style={[s.callBtn, { borderColor: svc.color }]}
              onPress={() => Linking.openURL(`tel:${svc.number}`)}
            >
              <Text style={[s.callLabel, { color: svc.color }]}>{svc.label}</Text>
              <Text style={[s.callNumber, { color: svc.color }]}>{svc.number}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Provider dispatch */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Dispatch a Provider</Text>

        {/* Property selector */}
        <Text style={s.fieldLabel}>Property</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow}>
          {properties.map((p) => (
            <TouchableOpacity key={p.id} onPress={() => setSelectedProperty(p.id)}
              style={[s.chip, selectedProperty === p.id && s.chipActive]}>
              <Text style={[s.chipText, selectedProperty === p.id && s.chipTextActive]}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Preferred providers */}
        <Text style={[s.fieldLabel, { marginTop: 12 }]}>Preferred Provider</Text>
        {loading ? (
          <ActivityIndicator color="#ef4444" style={{ marginTop: 12 }} />
        ) : providers.length === 0 ? (
          <Text style={s.emptyText}>No preferred providers. Add some from the Providers screen.</Text>
        ) : (
          <View style={s.providerList}>
            {providers.map((pp) => {
              const profile = pp.provider_profiles as any
              const name = profile?.business_name ?? `${profile?.first_name} ${profile?.last_name}`
              const isSelected = selectedProvider === pp.provider_id
              return (
                <TouchableOpacity key={pp.id} onPress={() => setSelectedProvider(pp.provider_id)}
                  style={[s.providerCard, isSelected && s.providerCardActive]}>
                  <View style={s.providerInfo}>
                    <Text style={s.providerName}>{name}</Text>
                    {profile?.trade_category && (
                      <Text style={s.providerTrade}>{profile.trade_category.replace('_', ' ')}</Text>
                    )}
                    {profile?.phone && (
                      <TouchableOpacity onPress={() => Linking.openURL(`tel:${profile.phone}`)}>
                        <Text style={s.providerPhone}>📞 {profile.phone}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={s.providerRight}>
                    <Text style={s.rating}>★ {profile?.rating_average?.toFixed(1)}</Text>
                    {isSelected && <Text style={s.selectedCheck}>✓</Text>}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        <Text style={[s.fieldLabel, { marginTop: 12 }]}>Emergency notes</Text>
        <TextInput
          style={[s.input, { height: 80, textAlignVertical: 'top' }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Describe the emergency situation"
          placeholderTextColor="#9ca3af"
          multiline
        />

        <TouchableOpacity
          style={[s.dispatchBtn, (dispatching || !selectedProperty || !selectedProvider) && s.dispatchBtnDisabled]}
          onPress={handleDispatch}
          disabled={dispatching || !selectedProperty || !selectedProvider}
        >
          {dispatching
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.dispatchBtnText}>🚨 Dispatch Now</Text>
          }
        </TouchableOpacity>
      </View>

      <View style={s.notice}>
        <Text style={s.noticeText}>Emergency bookings are charged at a 15% platform fee and are flagged for priority response.</Text>
      </View>
    </ScrollView>
  )
}

export default EmergencyDispatchScreen

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f9fafb' },
  inner:        { padding: 20, paddingTop: 56, paddingBottom: 40, gap: 14 },
  back:         { marginBottom: 4 },
  backText:     { color: '#1a56db', fontSize: 15 },
  sosHeader:    { backgroundColor: '#fef2f2', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1.5, borderColor: '#fca5a5' },
  sosEmoji:     { fontSize: 40, marginBottom: 8 },
  sosTitle:     { fontSize: 22, fontWeight: '800', color: '#991b1b', textAlign: 'center' },
  sosSub:       { fontSize: 14, color: '#b91c1c', textAlign: 'center', marginTop: 4 },
  card:         { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  callGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  callBtn:      { flex: 1, minWidth: '40%', borderWidth: 1.5, borderRadius: 12, padding: 14, alignItems: 'center' },
  callLabel:    { fontSize: 14, fontWeight: '700' },
  callNumber:   { fontSize: 16, fontWeight: '800', marginTop: 2 },
  fieldLabel:   { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  chipRow:      { flexDirection: 'row', marginBottom: 4 },
  chip:         { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8 },
  chipActive:   { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  chipText:     { fontSize: 13, color: '#6b7280' },
  chipTextActive: { color: '#ef4444', fontWeight: '600' },
  providerList: { gap: 8 },
  providerCard: { borderWidth: 1.5, borderColor: '#f3f4f6', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center' },
  providerCardActive: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  providerInfo: { flex: 1 },
  providerName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  providerTrade:{ fontSize: 12, color: '#6b7280', textTransform: 'capitalize', marginTop: 1 },
  providerPhone:{ fontSize: 13, color: '#1a56db', marginTop: 4 },
  providerRight:{ alignItems: 'flex-end', gap: 4 },
  rating:       { fontSize: 13, color: '#f59e0b', fontWeight: '600' },
  selectedCheck:{ fontSize: 18, color: '#ef4444', fontWeight: '700' },
  emptyText:    { fontSize: 13, color: '#9ca3af', fontStyle: 'italic', marginTop: 4 },
  input:        { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', marginBottom: 14 },
  dispatchBtn:  { backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  dispatchBtnDisabled: { opacity: 0.4 },
  dispatchBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  notice:       { backgroundColor: '#fef9c3', borderRadius: 12, padding: 12 },
  noticeText:   { fontSize: 12, color: '#854d0e', lineHeight: 18 },
})
