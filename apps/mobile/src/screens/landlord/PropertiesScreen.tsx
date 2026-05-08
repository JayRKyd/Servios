import { useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useProperties } from '@/store/store'
export function PropertiesScreen() {
  const { properties, isLoading, fetchProperties } = useProperties()
  useEffect(() => { fetchProperties() }, [])
  return (
    <View style={s.container}>
      <View style={s.headerRow}>
        <Text style={s.title}>Properties</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => router.push('/(tabs)/properties/add' as any)}><Text style={s.addText}>+ Add</Text></TouchableOpacity>
      </View>
      {isLoading ? <ActivityIndicator color='#1a56db' style={{ marginTop: 40 }} /> : (
        <FlatList data={properties} keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={<Text style={s.empty}>No properties yet. Add your first one!</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => router.push(('/(tabs)/properties/' + item.id) as any)}>
              <Text style={s.cardName}>{item.name}</Text>
              <Text style={s.cardType}>{item.property_type.replace('_',' ')}</Text>
              <Text style={s.cardAddr}>{item.address.street}, {item.address.city}, {item.address.island}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}
export default PropertiesScreen
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  addBtn: { backgroundColor: '#1a56db', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 }, addText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 1 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  cardType: { fontSize: 12, color: '#6b7280', textTransform: 'capitalize', marginTop: 2 },
  cardAddr: { fontSize: 13, color: '#6b7280', marginTop: 4 },
})