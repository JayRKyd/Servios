import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
const FAQ = [
  { q: 'How do I book a service?', a: 'Go to Search, find a service, and tap Book.' },
  { q: 'How do I cancel a booking?', a: 'Open the booking and tap Cancel before the provider accepts.' },
  { q: 'How does payment work?', a: 'Payment is processed securely via Stripe in USD (Bahamian Dollar).' },
  { q: 'How do I switch roles?', a: 'Go to Settings > Switch role.' },
]
export function HelpScreen() {
  return (
    <View style={s.c}>
      <Text style={s.t}>Help & FAQ</Text>
      {FAQ.map(item => (
        <View key={item.q} style={s.item}>
          <Text style={s.q}>{item.q}</Text>
          <Text style={s.a}>{item.a}</Text>
        </View>
      ))}
    </View>
  )
}
export default HelpScreen
const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#f9fafb', paddingTop: 60, paddingHorizontal: 24, gap: 16 },
  t: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  item: { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 6, elevation: 1 },
  q: { fontSize: 14, fontWeight: '600', color: '#111827' }, a: { fontSize: 13, color: '#6b7280', lineHeight: 20 },
})