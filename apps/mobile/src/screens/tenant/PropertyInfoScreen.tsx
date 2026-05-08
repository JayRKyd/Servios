import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/store/store'
import { supabase } from '@/lib/supabase'

export function PropertyInfoScreen() {
  const { user } = useAuth()
  const profile = (user as any)?.tenant_profiles?.[0]
  const propertyId = profile?.property_id
  const [property, setProperty] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!propertyId) return
    setLoading(true)
    supabase.from('properties').select('id, name, address, property_type, bedrooms, bathrooms').eq('id', propertyId).single()
      .then(({ data }) => { setProperty(data); setLoading(false) })
  }, [propertyId])

  if (loading) return <ActivityIndicator style={{ flex: 1, marginTop: 100 }} color="#1a56db" />

  return (
    <View style={s.container}>
      <Text style={s.title}>My Property</Text>

      {!propertyId ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyEmoji}>🏠</Text>
          <Text style={s.emptyTitle}>No property linked yet</Text>
          <Text style={s.emptySub}>Scan the QR code provided by your landlord to link your account.</Text>
          <TouchableOpacity style={s.scanBtn} onPress={() => router.push('/(tabs)/qr-scan' as any)}>
            <Text style={s.scanBtnText}>📷 Scan QR Code</Text>
          </TouchableOpacity>
        </View>
      ) : property ? (
        <View style={s.propertyCard}>
          <Text style={s.propertyName}>{property.name}</Text>
          {property.address?.street && (
            <Text style={s.propertyAddr}>{property.address.street}</Text>
          )}
          {property.address?.island && (
            <Text style={s.propertyAddr}>{property.address.island}</Text>
          )}
          <View style={s.detailRow}>
            {property.bedrooms && (
              <View style={s.detail}><Text style={s.detailVal}>{property.bedrooms}</Text><Text style={s.detailLabel}>Beds</Text></View>
            )}
            {property.bathrooms && (
              <View style={s.detail}><Text style={s.detailVal}>{property.bathrooms}</Text><Text style={s.detailLabel}>Baths</Text></View>
            )}
            <View style={s.detail}>
              <Text style={s.detailVal}>{property.property_type?.replace('_', ' ') ?? '—'}</Text>
              <Text style={s.detailLabel}>Type</Text>
            </View>
          </View>
          <TouchableOpacity style={s.scanAlt} onPress={() => router.push('/(tabs)/qr-scan' as any)}>
            <Text style={s.scanAltText}>📷 Change property via QR</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  )
}

export default PropertyInfoScreen

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f9fafb', paddingTop: 60, paddingHorizontal: 20 },
  title:        { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 20 },
  emptyCard:    { backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  emptyEmoji:   { fontSize: 48 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  emptySub:     { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  scanBtn:      { backgroundColor: '#1a56db', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 13, marginTop: 8 },
  scanBtnText:  { color: '#fff', fontSize: 15, fontWeight: '700' },
  propertyCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 6, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  propertyName: { fontSize: 20, fontWeight: '700', color: '#111827' },
  propertyAddr: { fontSize: 14, color: '#6b7280' },
  detailRow:    { flexDirection: 'row', gap: 16, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  detail:       { alignItems: 'center' },
  detailVal:    { fontSize: 16, fontWeight: '700', color: '#111827', textTransform: 'capitalize' },
  detailLabel:  { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  scanAlt:      { marginTop: 12, alignSelf: 'center' },
  scanAltText:  { fontSize: 13, color: '#1a56db' },
})
