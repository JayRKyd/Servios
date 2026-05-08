import { useEffect } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { useProperties } from '@/store/store'
export function PropertyDetailsScreen({ propertyId }: { propertyId: string }) {
  const { selectedProperty: p, isLoading, fetchProperty } = useProperties()
  useEffect(() => { fetchProperty(propertyId) }, [propertyId])
  if (isLoading || !p) return <ActivityIndicator color='#1a56db' style={{ flex: 1, marginTop: 100 }} />
  return (
    <View style={s.container}>
      <TouchableOpacity onPress={() => router.back()} style={s.back}><Text style={s.backText}>Back</Text></TouchableOpacity>
      <Text style={s.name}>{p.name}</Text>
      <Text style={s.type}>{p.property_type.replace('_',' ')}</Text>
      {[['Street', p.address.street],['City', p.address.city],['Island', p.address.island],p.bedrooms ? ['Bedrooms', String(p.bedrooms)] : null,p.bathrooms ? ['Bathrooms', String(p.bathrooms)] : null].filter(Boolean).map(([l,v]) => (
        <View key={l} style={s.row}><Text style={s.label}>{l}</Text><Text style={s.value}>{v}</Text></View>
      ))}
    </View>
  )
}
export default PropertyDetailsScreen
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: 60 },
  back: { marginBottom: 16 }, backText: { color: '#1a56db', fontSize: 15 },
  name: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  type: { fontSize: 14, color: '#6b7280', textTransform: 'capitalize', marginBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  label: { fontSize: 14, color: '#6b7280' }, value: { fontSize: 14, fontWeight: '500', color: '#111827' },
})