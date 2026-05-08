import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/store/store'
export function TenantHomeScreen() {
  const { user } = useAuth()
  const name = user?.tenant_profiles?.[0]?.first_name ?? 'Tenant'
  return (
    <View style={s.container}>
      <View style={s.header}><Text style={s.greeting}>Hi, {name}</Text><Text style={s.sub}>Your rental dashboard</Text></View>
      <View style={s.grid}>
        {([['🏠','My Property','/(tabs)/maintenance'],['🔧','Maintenance','/(tabs)/maintenance'],['💬','Messages','/(tabs)/messages'],['🚨','Emergency','/(tabs)/maintenance/new']] as const).map(([icon,label,route]) => (
          <TouchableOpacity key={label} style={s.card} onPress={() => router.push(route as any)}>
            <Text style={s.cardIcon}>{icon}</Text><Text style={s.cardLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}
export default TenantHomeScreen
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#1a56db', padding: 24, paddingTop: 60 },
  greeting: { fontSize: 24, fontWeight: '700', color: '#fff' }, sub: { fontSize: 14, color: '#bfdbfe', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  card: { width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 20, alignItems: 'center', gap: 10, elevation: 1 },
  cardIcon: { fontSize: 32 }, cardLabel: { fontSize: 13, fontWeight: '600', color: '#374151', textAlign: 'center' },
})