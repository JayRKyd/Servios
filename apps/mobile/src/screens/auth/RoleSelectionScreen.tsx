import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useRole } from '@/store/store'
import type { Role } from '@/types'

const ROLES: { value: Role; label: string; desc: string; icon: string }[] = [
  { value: 'customer', label: 'Customer', desc: 'Book home services', icon: '🏠' },
  { value: 'provider', label: 'Provider', desc: 'Offer your services', icon: '🔧' },
  { value: 'landlord', label: 'Landlord', desc: 'Manage properties', icon: '🏢' },
  { value: 'tenant', label: 'Tenant', desc: 'Manage your rental', icon: '🔑' },
]

export function RoleSelectionScreen() {
  const { availableRoles, switchRole, isSwitchingRole, activeRole } = useRole()
  const accessible = ROLES.filter(r => availableRoles.includes(r.value))

  async function handleSelect(role: Role) {
    await switchRole(role)
    router.replace('/(tabs)')
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>Switch role</Text>
      <Text style={s.sub}>Currently active: <Text style={s.active}>{activeRole}</Text></Text>
      {accessible.map(r => (
        <TouchableOpacity key={r.value} style={[s.card, r.value === activeRole && s.cardActive]}
          onPress={() => handleSelect(r.value)} disabled={isSwitchingRole}>
          <Text style={s.icon}>{r.icon}</Text>
          <View style={s.cardText}>
            <Text style={s.cardLabel}>{r.label}</Text>
            <Text style={s.cardDesc}>{r.desc}</Text>
          </View>
          {isSwitchingRole && <ActivityIndicator size="small" color="#1a56db" />}
        </TouchableOpacity>
      ))}
      <TouchableOpacity onPress={() => router.back()}><Text style={s.cancel}>Cancel</Text></TouchableOpacity>
    </View>
  )
}
export default RoleSelectionScreen
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 24, paddingTop: 60, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  active: { color: '#1a56db', fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 16, gap: 12 },
  cardActive: { borderColor: '#1a56db', backgroundColor: '#eff6ff' },
  icon: { fontSize: 28 },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 16, fontWeight: '600', color: '#111827' },
  cardDesc: { fontSize: 13, color: '#6b7280' },
  cancel: { textAlign: 'center', color: '#6b7280', fontSize: 15, marginTop: 8 },
})
