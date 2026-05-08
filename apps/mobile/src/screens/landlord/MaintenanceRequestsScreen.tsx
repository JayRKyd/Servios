import { useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useProperties } from '@/store/store'
export function MaintenanceRequestsScreen() {
  const { maintenanceRequests: reqs, isLoading, fetchMaintenance } = useProperties()
  useEffect(() => { fetchMaintenance() }, [])
  return (
    <View style={s.container}>
      <Text style={s.title}>Maintenance</Text>
      {isLoading ? <ActivityIndicator color='#1a56db' style={{ marginTop: 40 }} /> : (
        <FlatList data={reqs} keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ListEmptyComponent={<Text style={s.empty}>No maintenance requests</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => router.push(('/(tabs)/maintenance/' + item.id) as any)}>
              <Text style={s.cardTitle}>{item.title}</Text>
              <Text style={s.cardPri}>{item.priority}</Text>
              <View style={[s.badge, { backgroundColor: item.status === 'pending' ? '#fef9c3' : '#dcfce7' }]}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: item.status === 'pending' ? '#854d0e' : '#166534', textTransform: 'capitalize' }}>{item.status}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}
export default MaintenanceRequestsScreen
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  cardPri: { fontSize: 13, color: '#6b7280', textTransform: 'capitalize', marginTop: 2 },
  badge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8 },
})