import { useState, useCallback, useEffect } from 'react'
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView, Modal,
  Dimensions,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useProviderSearch } from '@/hooks/useProviderSearch'
import { useGeolocation } from '@/hooks/useGeolocation'
import { ProviderMapView } from './ProviderMapView'

const { width: SCREEN_W } = Dimensions.get('window')

const CATEGORIES = ['', 'Plumbing', 'Electrical', 'Cleaning', 'Landscaping', 'HVAC', 'Painting', 'Carpentry', 'Security']
const ISLANDS = ['', 'Grand Cayman', 'Cayman Brac', 'Little Cayman']
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'rating',     label: 'Top Rated' },
  { value: 'price_asc',  label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'distance',   label: 'Nearest First' },
]

export function SearchScreen() {
  const params = useLocalSearchParams<{ category?: string; context?: string }>()
  const { query, setQuery, filters, updateFilter, setLocationFilter, results, total, loading, error } = useProviderSearch()
  const { location, loading: geoLoading, granted: geoGranted, requestLocation } = useGeolocation()
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [showFilters, setShowFilters] = useState(false)

  // Apply category param from /book wizard
  useEffect(() => {
    if (params.category) updateFilter('category', params.category)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.category])

  // When location becomes available, apply it to search
  useEffect(() => {
    if (location) {
      setLocationFilter(location.lat, location.lng)
      updateFilter('sortBy', 'distance')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  function handleLocation() {
    requestLocation()
  }

  const activeFilterCount = [
    filters.category !== '',
    filters.island !== '',
    filters.minRating > 0,
    filters.maxPrice < 1000,
  ].filter(Boolean).length

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Find a Provider</Text>
        <Text style={s.subtitle}>{total} available</Text>
      </View>

      {/* Search bar */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Name, service, category…"
            placeholderTextColor="#9ca3af"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {loading && <ActivityIndicator size="small" color="#1a56db" />}
        </View>

        {/* Filter button */}
        <TouchableOpacity style={s.filterBtn} onPress={() => setShowFilters(true)}>
          <Text style={s.filterIcon}>⚙</Text>
          {activeFilterCount > 0 && (
            <View style={s.filterBadge}><Text style={s.filterBadgeText}>{activeFilterCount}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      {/* Location + view mode bar */}
      <View style={s.toolBar}>
        <TouchableOpacity style={[s.locBtn, geoGranted && s.locBtnActive]} onPress={handleLocation} disabled={geoLoading}>
          {geoLoading
            ? <ActivityIndicator size="small" color="#1a56db" />
            : <Text style={[s.locBtnText, geoGranted && s.locBtnTextActive]}>
                {geoGranted ? '📍 Near me' : '📍 Use location'}
              </Text>
          }
        </TouchableOpacity>
        <View style={s.viewToggle}>
          <TouchableOpacity
            style={[s.viewBtn, viewMode === 'list' && s.viewBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <Text style={[s.viewBtnText, viewMode === 'list' && s.viewBtnTextActive]}>☰ List</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.viewBtn, viewMode === 'map' && s.viewBtnActive]}
            onPress={() => setViewMode('map')}
          >
            <Text style={[s.viewBtnText, viewMode === 'map' && s.viewBtnTextActive]}>🗺 Map</Text>
          </TouchableOpacity>
        </View>
      </View>

      {error ? <Text style={s.error}>{error}</Text> : null}

      {/* Content */}
      {viewMode === 'map' ? (
        <ProviderMapView
          providers={results}
          userLocation={location}
          onProviderPress={(id) => router.push((`/provider-profile?id=${id}`) as any)}
          onRegionChange={(lat, lng, radius) => setLocationFilter(lat, lng, radius)}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(i) => i.user_id}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>{loading ? 'Searching…' : 'No providers found'}</Text>
              <Text style={s.emptyHint}>Try adjusting your filters</Text>
            </View>
          }
          renderItem={({ item: p }) => (
            <TouchableOpacity
              style={s.card}
              onPress={() => router.push((`/provider-profile?id=${p.user_id}${params.context ? `&context=${params.context}` : ''}`) as any)}
            >
              <View style={s.cardRow}>
                {/* Avatar */}
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{(p.business_name ?? p.first_name)?.[0]?.toUpperCase() ?? '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardName} numberOfLines={1}>
                    {p.business_name || p.first_name + ' ' + p.last_name}
                  </Text>
                  <View style={s.ratingRow}>
                    <Text style={s.stars}>{'★'.repeat(Math.round(p.rating_average))}{'☆'.repeat(5 - Math.round(p.rating_average))}</Text>
                    <Text style={s.ratingCount}>({p.rating_count})</Text>
                  </View>
                  {p.categories.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                      {p.categories.slice(0, 3).map((c) => (
                        <View key={c} style={s.catChip}><Text style={s.catChipText}>{c}</Text></View>
                      ))}
                    </ScrollView>
                  )}
                </View>
                <View style={s.priceCol}>
                  {p.hourly_rate > 0 && <Text style={s.price}>USD {p.hourly_rate}/hr</Text>}
                  {p.islands?.[0] && <Text style={s.island} numberOfLines={1}>{p.islands[0]}</Text>}
                  {p._rankingInfo?.geoDistance != null && (
                    <Text style={s.dist}>{(p._rankingInfo.geoDistance / 1000).toFixed(1)} km</Text>
                  )}
                </View>
              </View>
              {p.bio ? <Text style={s.bio} numberOfLines={2}>{p.bio}</Text> : null}
            </TouchableOpacity>
          )}
        />
      )}

      {/* Filter bottom sheet */}
      <Modal visible={showFilters} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowFilters(false)}>
        <View style={sf.container}>
          <View style={sf.header}>
            <Text style={sf.title}>Filters</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text style={sf.done}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={sf.body}>
            {/* Sort */}
            <Text style={sf.sectionLabel}>Sort by</Text>
            <View style={sf.chips}>
              {SORT_OPTIONS.map((o) => (
                <TouchableOpacity
                  key={o.value}
                  style={[sf.chip, filters.sortBy === o.value && sf.chipActive]}
                  onPress={() => updateFilter('sortBy', o.value as any)}
                >
                  <Text style={[sf.chipText, filters.sortBy === o.value && sf.chipTextActive]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Category */}
            <Text style={sf.sectionLabel}>Category</Text>
            <View style={sf.chips}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c || 'all'}
                  style={[sf.chip, filters.category === c && sf.chipActive]}
                  onPress={() => updateFilter('category', c)}
                >
                  <Text style={[sf.chipText, filters.category === c && sf.chipTextActive]}>{c || 'All'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Island */}
            <Text style={sf.sectionLabel}>Island</Text>
            <View style={sf.chips}>
              {ISLANDS.map((i) => (
                <TouchableOpacity
                  key={i || 'all'}
                  style={[sf.chip, filters.island === i && sf.chipActive]}
                  onPress={() => updateFilter('island', i)}
                >
                  <Text style={[sf.chipText, filters.island === i && sf.chipTextActive]}>{i || 'All Islands'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Min Rating */}
            <Text style={sf.sectionLabel}>Minimum Rating: {filters.minRating > 0 ? filters.minRating + '★' : 'Any'}</Text>
            <View style={sf.ratingRow}>
              {[0, 1, 2, 3, 4, 5].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[sf.ratingBtn, filters.minRating === r && sf.ratingBtnActive]}
                  onPress={() => updateFilter('minRating', r)}
                >
                  <Text style={[sf.ratingText, filters.minRating === r && sf.ratingTextActive]}>
                    {r === 0 ? 'Any' : r + '★'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Max price */}
            <Text style={sf.sectionLabel}>Max hourly rate: {filters.maxPrice < 1000 ? 'USD ' + filters.maxPrice : 'Any'}</Text>
            <View style={sf.priceRow}>
              {[50, 100, 200, 300, 500, 1000].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[sf.chip, filters.maxPrice === p && sf.chipActive]}
                  onPress={() => updateFilter('maxPrice', p)}
                >
                  <Text style={[sf.chipText, filters.maxPrice === p && sf.chipTextActive]}>
                    {p < 1000 ? 'USD ' + p : 'Any'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Clear */}
            {activeFilterCount > 0 && (
              <TouchableOpacity style={sf.clearBtn} onPress={() => {
                updateFilter('category', '')
                updateFilter('island', '')
                updateFilter('minRating', 0)
                updateFilter('maxPrice', 1000)
              }}>
                <Text style={sf.clearText}>Clear all filters</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}
export default SearchScreen

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  searchRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 8 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e5e7eb', gap: 8 },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, color: '#111827' },
  filterBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  filterIcon: { fontSize: 18 },
  filterBadge: { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, backgroundColor: '#1a56db', alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  toolBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
  locBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  locBtnActive: { borderColor: '#1a56db', backgroundColor: '#eff6ff' },
  locBtnText: { fontSize: 12, color: '#6b7280' },
  locBtnTextActive: { color: '#1a56db', fontWeight: '600' },
  viewToggle: { flexDirection: 'row', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  viewBtn: { paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#fff' },
  viewBtnActive: { backgroundColor: '#1a56db' },
  viewBtnText: { fontSize: 12, color: '#6b7280' },
  viewBtnTextActive: { color: '#fff', fontWeight: '600' },
  error: { color: '#ef4444', fontSize: 13, paddingHorizontal: 16, marginBottom: 4 },
  list: { padding: 16, gap: 12 },
  empty: { alignItems: 'center', marginTop: 48 },
  emptyText: { fontSize: 16, color: '#9ca3af', fontWeight: '600' },
  emptyHint: { fontSize: 13, color: '#d1d5db', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  cardRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#1a56db' },
  cardName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  stars: { fontSize: 12, color: '#f59e0b' },
  ratingCount: { fontSize: 11, color: '#9ca3af' },
  catChip: { backgroundColor: '#eff6ff', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, marginRight: 4 },
  catChipText: { fontSize: 11, color: '#1a56db', fontWeight: '600' },
  priceCol: { alignItems: 'flex-end', minWidth: 80 },
  price: { fontSize: 13, fontWeight: '700', color: '#1a56db' },
  island: { fontSize: 11, color: '#9ca3af', marginTop: 2, maxWidth: 80 },
  dist: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  bio: { fontSize: 12, color: '#6b7280', marginTop: 8, lineHeight: 16 },
})

// Filter sheet styles
const sf = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  done: { fontSize: 15, color: '#1a56db', fontWeight: '600' },
  body: { padding: 20, gap: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#fff' },
  chipActive: { borderColor: '#1a56db', backgroundColor: '#eff6ff' },
  chipText: { fontSize: 13, color: '#6b7280' },
  chipTextActive: { color: '#1a56db', fontWeight: '600' },
  ratingRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  ratingBtn: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff' },
  ratingBtnActive: { borderColor: '#1a56db', backgroundColor: '#eff6ff' },
  ratingText: { fontSize: 13, color: '#6b7280' },
  ratingTextActive: { color: '#1a56db', fontWeight: '600' },
  priceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  clearBtn: { marginTop: 24, borderWidth: 1, borderColor: '#ef4444', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  clearText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
})
