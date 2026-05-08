import { View, Text, StyleSheet } from 'react-native'
import { useAuth } from '@/store/store'
export function ProfileScreen() {
  const { user } = useAuth()
  return (
    <View style={s.c}>
      <Text style={s.t}>Profile</Text>
      <Text style={s.email}>{user?.email}</Text>
      <Text style={s.roles}>Roles: {user?.roles?.join(', ') ?? 'none'}</Text>
    </View>
  )
}
export default ProfileScreen
const s = StyleSheet.create({ c: { flex: 1, backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 24, gap: 8 }, t: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 }, email: { fontSize: 15, color: '#374151' }, roles: { fontSize: 14, color: '#6b7280', textTransform: 'capitalize' } })