import { useState, useEffect, useCallback, useRef } from 'react'
import { algoliaConfigured, searchClient, PROVIDERS_INDEX } from '@/lib/algolia'
import { supabase } from '@/lib/supabase'

export type ProviderHit = {
  objectID: string
  user_id: string
  business_name: string
  first_name: string
  last_name: string
  bio: string
  islands: string[]
  hourly_rate: number
  rating_average: number
  rating_count: number
  categories: string[]
  avatar_url: string | null
  _geoloc?: { lat: number; lng: number }
  _rankingInfo?: { geoDistance?: number }
}

export type SearchFilters = {
  category: string
  minRating: number
  maxPrice: number
  island: string
  sortBy: 'rating' | 'price_asc' | 'price_desc' | 'distance'
  aroundLat?: number
  aroundLng?: number
  aroundRadius?: number
}

const DEFAULT_FILTERS: SearchFilters = {
  category: '', minRating: 0, maxPrice: 1000, island: '', sortBy: 'rating',
}

export function useProviderSearch() {
  const [query, setQuery]     = useState('')
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS)
  const [results, setResults] = useState<ProviderHit[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const search = useCallback(async (q: string, f: SearchFilters) => {
    setLoading(true)
    setError(null)
    try {
      if (algoliaConfigured) {
        const index = searchClient.initIndex(PROVIDERS_INDEX)
        const facetFilters: string[][] = []
        if (f.category) facetFilters.push([`categories:${f.category}`])
        if (f.island)   facetFilters.push([`islands:${f.island}`])
        const numericFilters: string[] = []
        if (f.minRating > 0)   numericFilters.push(`rating_average >= ${f.minRating}`)
        if (f.maxPrice < 1000) numericFilters.push(`hourly_rate <= ${f.maxPrice}`)
        const params: Record<string, any> = { facetFilters, numericFilters, hitsPerPage: 40, getRankingInfo: true }
        if (f.aroundLat != null && f.aroundLng != null) {
          params.aroundLatLng = `${f.aroundLat},${f.aroundLng}`
          params.aroundRadius = f.aroundRadius ?? 50000
        }
        const { hits, nbHits } = await index.search<ProviderHit>(q, params)
        let sorted = [...hits]
        if (f.sortBy === 'price_asc')  sorted.sort((a, b) => a.hourly_rate - b.hourly_rate)
        if (f.sortBy === 'price_desc') sorted.sort((a, b) => b.hourly_rate - a.hourly_rate)
        if (f.sortBy === 'rating')     sorted.sort((a, b) => b.rating_average - a.rating_average)
        setResults(sorted); setTotal(nbHits)
      } else {
        // Supabase fallback
        let builder = supabase.from('provider_profiles')
          .select('user_id, business_name, first_name, last_name, bio, islands, hourly_rate, rating_average, rating_count, avatar_url')
          .eq('is_active', true).eq('is_verified', true)
        if (q.trim()) builder = builder.ilike('business_name', `%${q}%`)
        if (f.island)          builder = builder.contains('islands', [f.island])
        if (f.minRating > 0)   builder = builder.gte('rating_average', f.minRating)
        if (f.maxPrice < 1000) builder = builder.lte('hourly_rate', f.maxPrice)
        if (f.sortBy === 'price_asc')  builder = builder.order('hourly_rate', { ascending: true })
        else if (f.sortBy === 'price_desc') builder = builder.order('hourly_rate', { ascending: false })
        else builder = builder.order('rating_average', { ascending: false })
        const { data, count } = await builder.limit(40)
        setResults((data ?? []).map((p: any) => ({ ...p, objectID: p.user_id, categories: [] })))
        setTotal(count ?? 0)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(query, filters), 350)
    return () => clearTimeout(timerRef.current)
  }, [query, filters, search])

  function updateFilter<K extends keyof SearchFilters>(key: K, val: SearchFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: val }))
  }
  function setLocationFilter(lat: number, lng: number, radius = 50000) {
    setFilters((prev) => ({ ...prev, aroundLat: lat, aroundLng: lng, aroundRadius: radius }))
  }

  return { query, setQuery, filters, updateFilter, setLocationFilter, results, total, loading, error }
}
