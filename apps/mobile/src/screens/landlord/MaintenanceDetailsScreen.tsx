import { useEffect } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { useProperties } from '@/store/store'
export function MaintenanceDetailsScreen({ requestId }: { requestId: string }) {
  const { selectedMaintenance: req, fetchMaintenanceRequest } = useProperties()
  useEffect(() => { fetchMaintenanceRequest(requestId) }, [requestId])
  if (!req) return <ActivityIndicator color='#1a56db' style={{ flex: 1, marginTop: 100 }} />
  return (
    <View style={s.container}>
      <TouchableOpacity onPress={() => router.back()} style={s.back}><Text style={s.backText}>Back</Text></TouchableOpacity>
      <Text style={s.title}>{req.title}</Text>
      <Text style={s.desc}>{req.description}</Text>
      {[['Priority', req.priority],['Status', req.status],['Category', req.category ?? 'N/A']].map(([l,v]) => (
        <View key={l} style={s.row}><Text style={s.label}>{l}</Text><Text style={s.value}>{v}</Text></View>
      ))}
      <TouchableOpacity style={s.btn} onPress={() => router.push(('/(tabs)/maintenance/' + req.id + '/approve') as any)}><Text style={s.btnText}>Approve request</Text></TouchableOpacity>
    </View>
  )
}
export default MaintenanceDetailsScreen
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: 60 },
  back: { marginBottom: 16 }, backText: { color: '#1a56db', fontSize: 15 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  desc: { fontSize: 14, color: '#374151', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  label: { fontSize: 14, color: '#6b7280' }, value: { fontSize: 14, fontWeight: '500', color: '#111827', textTransform: 'capitalize' },
  btn: { backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})