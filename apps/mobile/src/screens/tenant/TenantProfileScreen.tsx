import { View, Text, StyleSheet } from 'react-native'
import { useAuth } from '@/store/store'
export function TenantProfileScreen() {
  const { user } = useAuth()
  const p = user?.tenant_profiles?.[0]
  return (
    <View style={s.c}>
      <Text style={s.t}>My Profile</Text>
      {p && <><Text style={s.name}>{p.first_name} {p.last_name}</Text><Text style={s.sub}>{user?.email}</Text></>}
    </View>
  )
}
export default TenantProfileScreen
const s = StyleSheet.create({ c: { flex: 1, backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 24, gap: 8 }, t: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 }, name: { fontSize: 18, fontWeight: '600', color: '#111827' }, sub: { fontSize: 14, color: '#6b7280' } })