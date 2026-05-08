import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/store/store'
export function ProviderProfileScreen() {
  const { user } = useAuth()
  const p = user?.provider_profiles?.[0]
  return (
    <View style={s.container}>
      <Text style={s.title}>My Profile</Text>
      {p && <><Text style={s.name}>{p.first_name} {p.last_name}</Text><Text style={s.biz}>{p.business_name}</Text><Text style={s.rating}>Rating: {p.rating_average.toFixed(1)} ({p.rating_count} reviews)</Text></>}
      <TouchableOpacity style={s.btn} onPress={() => router.push('/(tabs)/settings/profile' as any)}><Text style={s.btnText}>Edit profile</Text></TouchableOpacity>
    </View>
  )
}
export default ProviderProfileScreen
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: 60, gap: 10 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  name: { fontSize: 18, fontWeight: '600', color: '#111827' }, biz: { fontSize: 15, color: '#6b7280' },
  rating: { fontSize: 14, color: '#374151' },
  btn: { backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})