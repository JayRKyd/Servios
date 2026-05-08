import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useAuth, useRole } from '@/store/store'
export function SettingsScreen() {
  const { user, signOut } = useAuth()
  const { activeRole } = useRole()
  const items = [
    { label: 'Edit profile', route: '/(tabs)/settings/profile' },
    { label: 'Manage roles', route: '/(tabs)/settings/roles' },
    { label: 'Switch role', route: '/(auth)/role-selection' },
    { label: 'Help', route: null },
  ]
  return (
    <View style={s.container}>
      <Text style={s.title}>Settings</Text>
      <View style={s.info}><Text style={s.name}>{user?.email}</Text><Text style={s.role}>Active: {activeRole}</Text></View>
      {items.map(item => (
        <TouchableOpacity key={item.label} style={s.item} onPress={() => item.route && router.push(item.route as any)}>
          <Text style={s.itemText}>{item.label}</Text>
          <Text style={s.arrow}>›</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={s.signOut} onPress={signOut}><Text style={s.signOutText}>Sign out</Text></TouchableOpacity>
    </View>
  )
}
export default SettingsScreen
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', paddingTop: 60 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', paddingHorizontal: 16, marginBottom: 16 },
  info: { backgroundColor: '#fff', padding: 16, marginHorizontal: 16, borderRadius: 12, marginBottom: 16, elevation: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827' }, role: { fontSize: 13, color: '#6b7280', marginTop: 2, textTransform: 'capitalize' },
  item: { backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  itemText: { fontSize: 15, color: '#111827' }, arrow: { fontSize: 20, color: '#9ca3af' },
  signOut: { margin: 24, borderWidth: 1, borderColor: '#ef4444', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  signOutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
})