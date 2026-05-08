import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
export function TenantDetailsScreen({ tenantId }: { tenantId?: string }) {
  const params = useLocalSearchParams<{ tenantId: string }>()
  return (
    <View style={s.c}>
      <TouchableOpacity onPress={() => router.back()} style={s.back}><Text style={s.backText}>Back</Text></TouchableOpacity>
      <Text style={s.t}>Tenant Details</Text>
      <Text style={s.sub}>ID: {tenantId ?? params.tenantId}</Text>
    </View>
  )
}
export default TenantDetailsScreen
const s = StyleSheet.create({ c: { flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: 60, gap: 12 }, back: { marginBottom: 4 }, backText: { color: '#1a56db', fontSize: 15 }, t: { fontSize: 22, fontWeight: '700', color: '#111827' }, sub: { fontSize: 14, color: '#6b7280' } })