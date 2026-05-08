import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/store'

interface Notification {
  id: string
  title: string
  body: string
  type: string
  read: boolean
  data?: Record<string, string>
  created_at: string
}

const TYPE_ICON: Record<string, string> = {
  booking_accepted:   '✅',
  booking_rejected:   '❌',
  booking_completed:  '🎉',
  booking_request:    '📋',
  maintenance_update: '🔧',
  payment_released:   '💰',
  review_received:    '⭐',
  claim_update:       '🛡',
  compliance_expiry:  '⚠️',
  general:            '🔔',
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function NotificationsScreen() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function fetchNotifications() {
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications(data ?? [])
  }

  useEffect(() => {
    fetchNotifications().finally(() => setLoading(false))
  }, [user])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchNotifications()
    setRefreshing(false)
  }

  async function markRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }

  async function markAllRead() {
    if (!user) return
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id)
  }

  function handleTap(n: Notification) {
    markRead(n.id)
    const d = n.data ?? {}
    if (d.bookingId) router.push(`/(tabs)/bookings/${d.bookingId}` as any)
    else if (d.maintenanceId) router.push(`/(tabs)/maintenance/${d.maintenanceId}` as any)
    else if (d.conversationId) router.push(`/(tabs)/messages/${d.conversationId}` as any)
  }

  const unreadCount = notifications.filter(n => !n.read).length

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color="#1a56db" />
      </View>
    )
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={s.markAll}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {unreadCount > 0 && (
        <View style={s.unreadBanner}>
          <Text style={s.unreadBannerText}>{unreadCount} unread</Text>
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={n => n.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1a56db" />}
        contentContainerStyle={notifications.length === 0 ? s.emptyContainer : s.list}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>🔔</Text>
            <Text style={s.emptyTitle}>All caught up!</Text>
            <Text style={s.emptySub}>No notifications yet. We'll let you know when something needs your attention.</Text>
          </View>
        }
        renderItem={({ item: n }) => (
          <TouchableOpacity
            style={[s.card, !n.read && s.unread]}
            onPress={() => handleTap(n)}
            activeOpacity={0.7}
          >
            <View style={s.iconBox}>
              <Text style={s.icon}>{TYPE_ICON[n.type] ?? TYPE_ICON.general}</Text>
            </View>
            <View style={s.content}>
              <Text style={[s.notifTitle, !n.read && s.boldTitle]} numberOfLines={1}>{n.title}</Text>
              <Text style={s.body} numberOfLines={2}>{n.body}</Text>
              <Text style={s.time}>{timeAgo(n.created_at)}</Text>
            </View>
            {!n.read && <View style={s.dot} />}
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

export default NotificationsScreen

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f9fafb' },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  title:          { fontSize: 24, fontWeight: '700', color: '#111827' },
  markAll:        { fontSize: 13, color: '#1a56db', fontWeight: '600' },
  unreadBanner:   { marginHorizontal: 20, marginBottom: 8, backgroundColor: '#eff6ff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  unreadBannerText:{ fontSize: 12, color: '#1a56db', fontWeight: '600' },
  list:           { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyState:     { alignItems: 'center', gap: 10 },
  emptyIcon:      { fontSize: 48 },
  emptyTitle:     { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptySub:       { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  card:           { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  unread:         { backgroundColor: '#eff6ff' },
  iconBox:        { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  icon:           { fontSize: 20 },
  content:        { flex: 1, gap: 2 },
  notifTitle:     { fontSize: 14, color: '#111827' },
  boldTitle:      { fontWeight: '700' },
  body:           { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  time:           { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  dot:            { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1a56db', marginTop: 4 },
})
