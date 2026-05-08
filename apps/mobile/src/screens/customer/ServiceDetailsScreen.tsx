import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
export function ServiceDetailsScreen({ serviceId }: { serviceId?: string }) {
  const params = useLocalSearchParams<{ serviceId: string }>()
  const id = serviceId ?? params.serviceId
  return (
    <View style={s.container}>
      <TouchableOpacity onPress={() => router.back()} style={s.back}><Text style={s.backText}>Back</Text></TouchableOpacity>
      <Text style={s.title}>Service Details</Text>
      <Text style={s.sub}>ID: {id}</Text>
      <TouchableOpacity style={s.btn} onPress={() => router.push(('/(tabs)/bookings/new?serviceId=' + id) as any)}>
        <Text style={s.btnText}>Book this service</Text>
      </TouchableOpacity>
    </View>
  )
}
export default ServiceDetailsScreen
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: 60, gap: 12 },
  back: { marginBottom: 4 }, backText: { color: '#1a56db', fontSize: 15 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 14, color: '#6b7280' },
  btn: { backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})