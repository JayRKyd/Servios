import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl, Alert,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/store'

interface Tenant {
  id: string
  user_id: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  tenancy_start_date: string | null
  tenancy_end_date: string | null
  property_id: string
  properties: { name: string; address_line1: string } | null
  joined: boolean
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function TenantsScreen() {
  const { user } = useAuth()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function fetchTenants() {
    if (!user) return
    // Get all properties this landlord owns, then all tenant_profiles linked to them
    const { data: props } = await supabase
      .from('properties')
      .select('id')
      .eq('landlord_id', user.id)

    if (!props || props.length === 0) {
      setTenants([])
      return
    }

    const propertyIds = props.map(p => p.id)

    const { data } = await supabase
      .from('tenant_profiles')
      .select(`
        id, user_id, first_name, last_name, email, phone,
        tenancy_start_date, tenancy_end_date, property_id,
        properties:property_id (name, address_line1)
      `)
      .in('property_id', propertyIds)
      .order('created_at', { ascending: false })

    setTenants(
      (data ?? []).map((t: any) => ({ ...t, joined: !!t.user_id }))
    )
  }

  useEffect(() => {
    fetchTenants().finally(() => setLoading(false))
  }, [user])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchTenants()
    setRefreshing(false)
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator color="#1a56db" /></View>
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Tenants</Text>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => router.push('/(tabs)/properties' as any)}
        >
          <Text style={s.addBtnText}>+ Add Tenant</Text>
        </TouchableOpacity>
      </View>

      {tenants.length > 0 && (
        <Text style={s.count}>{tenants.length} tenant{tenants.length !== 1 ? 's' : ''} across your properties</Text>
      )}

      <FlatList
        data={tenants}
        keyExtractor={t => t.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1a56db" />}
        contentContainerStyle={tenants.length === 0 ? s.emptyContainer : s.list}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>👥</Text>
            <Text style={s.emptyTitle}>No tenants yet</Text>
            <Text style={s.emptySub}>Add tenants from your property page or share the property QR code.</Text>
          </View>
        }
        renderItem={({ item: t }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() => router.push(`/(tabs)/properties/${t.property_id}` as any)}
            activeOpacity={0.7}
          >
            <View style={s.cardLeft}>
              <View style={s.initials}>
                <Text style={s.initialsText}>
                  {(t.first_name?.[0] ?? '?').toUpperCase()}{(t.last_name?.[0] ?? '').toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={s.cardBody}>
              <View style={s.nameRow}>
                <Text style={s.name}>{t.first_name} {t.last_name}</Text>
                <View style={[s.badge, t.joined ? s.badgeJoined : s.badgePending]}>
                  <Text style={[s.badgeText, t.joined ? s.badgeJoinedText : s.badgePendingText]}>
                    {t.joined ? 'Joined' : 'Invite sent'}
                  </Text>
                </View>
              </View>
              <Text style={s.property} numberOfLines={1}>
                {(t.properties as any)?.name ?? (t.properties as any)?.address_line1 ?? 'Unknown property'}
              </Text>
              {t.tenancy_start_date && (
                <Text style={s.dates}>
                  {formatDate(t.tenancy_start_date)} — {t.tenancy_end_date ? formatDate(t.tenancy_end_date) : 'Ongoing'}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

export default TenantsScreen

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f9fafb' },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  title:            { fontSize: 24, fontWeight: '700', color: '#111827' },
  addBtn:           { backgroundColor: '#1a56db', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText:       { color: '#fff', fontWeight: '700', fontSize: 13 },
  count:            { fontSize: 13, color: '#6b7280', paddingHorizontal: 20, marginBottom: 12 },
  list:             { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  emptyContainer:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyState:       { alignItems: 'center', gap: 10 },
  emptyIcon:        { fontSize: 48 },
  emptyTitle:       { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptySub:         { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  card:             { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardLeft:         { },
  initials:         { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  initialsText:     { fontSize: 16, fontWeight: '700', color: '#1a56db' },
  cardBody:         { flex: 1, gap: 2 },
  nameRow:          { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name:             { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  badge:            { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  badgeJoined:      { backgroundColor: '#dcfce7' },
  badgePending:     { backgroundColor: '#fef9c3' },
  badgeText:        { fontSize: 11, fontWeight: '600' },
  badgeJoinedText:  { color: '#15803d' },
  badgePendingText: { color: '#a16207' },
  property:         { fontSize: 12, color: '#6b7280' },
  dates:            { fontSize: 11, color: '#9ca3af' },
})
