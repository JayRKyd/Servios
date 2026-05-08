import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, TextInput, FlatList,
  StyleSheet, ActivityIndicator, Alert, ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/store/store'
import { preferredProvidersApi, PreferredProvider } from '@/services/api/preferred-providers.api'
import { supabase } from '@/lib/supabase'

export function PreferredProvidersScreen() {
  const { session } = useAuth()
  const token = session?.access_token

  const [preferred, setPreferred] = useState<PreferredProvider[]>([])
  const [loading, setLoading] = useState(true)

  // Search
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [searchVisible, setSearchVisible] = useState(false)

  const preferredIds = new Set(preferred.map((p) => p.provider.user_id))

  const fetchPreferred = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const { preferred_providers } = await preferredProvidersApi.list(token)
      setPreferred(preferred_providers)
    } catch {
      Alert.alert('Error', 'Could not load preferred providers')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchPreferred() }, [fetchPreferred])

  async function handleSearch(q: string) {
    setSearchQ(q)
    if (q.trim().length < 2) { setSearchResults([]); return }
    setSearching(true)
    const { data } = await supabase
      .from('provider_profiles')
      .select('user_id, display_name, categories, rating_average, island, is_verified')
      .ilike('display_name', `%${q}%`)
      .eq('is_verified', true)
      .limit(8)
    setSearchResults(data ?? [])
    setSearching(false)
  }

  async function addProvider(providerId: string) {
    if (!token) return
    try {
      await preferredProvidersApi.add(token, providerId)
      setSearchVisible(false)
      setSearchQ('')
      setSearchResults([])
      fetchPreferred()
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to add provider')
    }
  }

  async function removeProvider(providerId: string, name: string) {
    Alert.alert(`Remove ${name}?`, 'They will be removed from your preferred list.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          if (!token) return
          await preferredProvidersApi.remove(token, providerId)
          setPreferred((prev) => prev.filter((p) => p.provider.user_id !== providerId))
        },
      },
    ])
  }

  if (loading) return <ActivityIndicator color='#1a56db' style={{ flex: 1, marginTop: 100 }} />

  return (
    <ScrollView style={s.container} contentContainerStyle={s.inner}>
      {/* Header */}
      <View style={s.headerRow}>
        <Text style={s.title}>Preferred Providers</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setSearchVisible((v) => !v)}>
          <Text style={s.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search panel */}
      {searchVisible && (
        <View style={s.searchPanel}>
          <TextInput
            value={searchQ}
            onChangeText={handleSearch}
            placeholder="Search provider name…"
            style={s.searchInput}
            autoFocus
            placeholderTextColor='#9ca3af'
          />
          {searching && <ActivityIndicator size='small' color='#1a56db' style={{ marginTop: 8 }} />}
          {searchResults.map((r) => (
            <View key={r.user_id} style={s.searchRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.searchName}>{r.display_name}</Text>
                <Text style={s.searchMeta}>
                  {r.island ? r.island + ' · ' : ''}
                  {r.categories?.slice(0, 2).join(', ')}
                  {r.rating_average ? ` · ★ ${r.rating_average.toFixed(1)}` : ''}
                </Text>
              </View>
              {preferredIds.has(r.user_id) ? (
                <Text style={s.alreadyAdded}>Added</Text>
              ) : (
                <TouchableOpacity style={s.addRowBtn} onPress={() => addProvider(r.user_id)}>
                  <Text style={s.addRowBtnText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          {searchQ.length >= 2 && !searching && searchResults.length === 0 && (
            <Text style={s.noResults}>No verified providers found</Text>
          )}
        </View>
      )}

      {/* Preferred list */}
      {preferred.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>No preferred providers yet</Text>
          <TouchableOpacity onPress={() => setSearchVisible(true)}>
            <Text style={s.emptyLink}>Add your first provider</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.list}>
          {preferred.map((pp) => {
            const p = pp.provider
            const initials = p.display_name?.slice(0, 2).toUpperCase() ?? '??'
            return (
              <View key={pp.id} style={s.card}>
                <View style={s.cardRow}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{initials}</Text>
                  </View>
                  <View style={s.cardInfo}>
                    <View style={s.nameRow}>
                      <Text style={s.name}>{p.display_name}</Text>
                      {p.is_verified && <Text style={s.verified}>✓</Text>}
                    </View>
                    <Text style={s.meta} numberOfLines={1}>
                      {[p.island, p.categories?.slice(0, 2).join(', '), p.rating_average ? `★ ${p.rating_average.toFixed(1)}` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                    {pp.notes ? (
                      <Text style={s.notes} numberOfLines={2}>{pp.notes}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => removeProvider(p.user_id, p.display_name)}
                    style={s.removeBtn}
                  >
                    <Text style={s.removeBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
                {p.hourly_rate && (
                  <Text style={s.rate}>USD {p.hourly_rate}/hr</Text>
                )}
              </View>
            )
          })}
        </View>
      )}
    </ScrollView>
  )
}

export default PreferredProvidersScreen

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  inner: { padding: 20, paddingTop: 60, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  addBtn: { backgroundColor: '#1a56db', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  searchPanel: { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1, gap: 8 },
  searchInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#111827' },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  searchName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  searchMeta: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  alreadyAdded: { fontSize: 12, color: '#16a34a', fontWeight: '600' },
  addRowBtn: { backgroundColor: '#eff6ff', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  addRowBtnText: { color: '#1a56db', fontSize: 12, fontWeight: '600' },
  noResults: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 8 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 15, color: '#9ca3af' },
  emptyLink: { fontSize: 14, color: '#1a56db', textDecorationLine: 'underline' },

  list: { gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700', color: '#1a56db' },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827' },
  verified: { fontSize: 11, color: '#16a34a', fontWeight: '700' },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 3 },
  notes: { fontSize: 12, color: '#374151', marginTop: 4, fontStyle: 'italic' },
  rate: { fontSize: 12, color: '#1a56db', fontWeight: '500', marginTop: 8 },
  removeBtn: { borderWidth: 1, borderColor: '#fca5a5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  removeBtnText: { color: '#ef4444', fontSize: 12 },
})
