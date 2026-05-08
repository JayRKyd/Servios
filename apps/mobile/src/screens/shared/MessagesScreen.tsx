import { useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useMessages } from '@/store/store'
export function MessagesScreen() {
  const { conversations, isLoading, fetchConversations } = useMessages()
  useEffect(() => { fetchConversations() }, [])
  return (
    <View style={s.container}>
      <Text style={s.title}>Messages</Text>
      {isLoading ? <ActivityIndicator color='#1a56db' style={{ marginTop: 40 }} /> : (
        <FlatList data={conversations} keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ListEmptyComponent={<Text style={s.empty}>No conversations yet</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => router.push(('/(tabs)/messages/' + item.id) as any)}>
              <Text style={s.cardId}>Conversation</Text>
              <Text style={s.cardDate}>{item.updated_at ? new Date(item.updated_at).toLocaleDateString() : ''}</Text>
              <Text style={s.cardPart}>{item.participants.length} participant{item.participants.length !== 1 ? 's' : ''}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}
export default MessagesScreen
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 1 },
  cardId: { fontSize: 15, fontWeight: '600', color: '#111827' },
  cardDate: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  cardPart: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
})