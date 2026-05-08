import { useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useAuth, useProperties } from '@/store/store'
export function LandlordHomeScreen() {
  const { user } = useAuth()
  const { properties, isLoading, fetchProperties, maintenanceRequests, fetchMaintenance } = useProperties()
  useEffect(() => { fetchProperties(); fetchMaintenance() }, [])
  const name = user?.landlord_profiles?.[0]?.first_name ?? 'Landlord'
  const pending = maintenanceRequests.filter(r => r.status === 'pending')
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.greeting}>Hi, {name}</Text>
        <Text style={s.sub}>{properties.length} properties · {pending.length} pending maintenance</Text>
      </View>
      <View style={s.actions}>
        {([['🏠','Properties','/(tabs)/properties'],['👥','Maintenance','/(tabs)/maintenance'],['💬','Messages','/(tabs)/messages'],['⚙️','Settings','/(tabs)/settings']] as const).map(([icon,label,route]) => (
          <TouchableOpacity key={label} style={s.actionBtn} onPress={() => router.push(route as any)}>
            <Text style={s.actionIcon}>{icon}</Text><Text style={s.actionLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.section}>Properties</Text>
      {isLoading ? <ActivityIndicator color='#1a56db' style={{ marginTop: 16 }} /> : (
        <FlatList data={properties.slice(0,3)} keyExtractor={i => i.id}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          ListEmptyComponent={<Text style={s.empty}>No properties yet</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => router.push(('/(tabs)/properties/' + item.id) as any)}>
              <Text style={s.cardName}>{item.name}</Text>
              <Text style={s.cardAddr}>{item.address.street}, {item.address.island}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}
export default LandlordHomeScreen
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#1a56db', padding: 24, paddingTop: 60 },
  greeting: { fontSize: 24, fontWeight: '700', color: '#fff' }, sub: { fontSize: 14, color: '#bfdbfe', marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 10 },
  actionBtn: { width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', gap: 6, elevation: 1 },
  actionIcon: { fontSize: 24 }, actionLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
  section: { fontSize: 16, fontWeight: '700', color: '#111827', paddingHorizontal: 16, marginBottom: 8 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 24 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 1 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#111827' }, cardAddr: { fontSize: 13, color: '#6b7280', marginTop: 2 },
})