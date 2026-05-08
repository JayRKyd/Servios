/**
 * ProviderMapView — Mapbox map for provider discovery
 *
 * Requires @rnmapbox/maps which is a native module.
 * This works with Expo Dev Build (not Expo Go):
 *   pnpm add @rnmapbox/maps
 *   expo prebuild  (or eas build --profile development)
 *
 * Set EXPO_PUBLIC_MAPBOX_TOKEN in your .env
 */
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import type { ProviderHit } from '@/hooks/useProviderSearch'

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? ''

// Dynamically import Mapbox so the app doesn't crash without it
let Mapbox: any = null
let MapboxModule: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  MapboxModule = require('@rnmapbox/maps')
  Mapbox = MapboxModule.default
  if (MAPBOX_TOKEN) Mapbox.setAccessToken(MAPBOX_TOKEN)
} catch {
  // @rnmapbox/maps not installed — show placeholder
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const DEFAULT_CENTER: [number, number] = [-81.3812, 19.3133] // Grand Cayman

export function ProviderMapView({
  providers,
  userLocation,
  onProviderPress,
  onRegionChange,
}: {
  providers: ProviderHit[]
  userLocation: { lat: number; lng: number } | null
  onProviderPress: (userId: string) => void
  onRegionChange: (lat: number, lng: number, radiusMetres: number) => void
}) {
  if (!Mapbox || !MapboxModule || !MAPBOX_TOKEN) {
    return (
      <View style={s.placeholder}>
        <Text style={s.placeholderTitle}>Map view</Text>
        <Text style={s.placeholderDesc}>
          {!MAPBOX_TOKEN
            ? 'Add EXPO_PUBLIC_MAPBOX_TOKEN to enable maps'
            : 'Install @rnmapbox/maps and run expo prebuild'}
        </Text>
        <Text style={s.placeholderCount}>{providers.length} providers in current search</Text>
      </View>
    )
  }

  const { MapView, Camera, ShapeSource, SymbolLayer, CircleLayer, Images, UserLocation } = MapboxModule

  // Build GeoJSON for providers with coordinates
  const geoProviders = providers.filter((p) => p._geoloc)
  const geojson = {
    type: 'FeatureCollection' as const,
    features: geoProviders.map((p) => ({
      type: 'Feature' as const,
      id: p.user_id,
      geometry: { type: 'Point' as const, coordinates: [p._geoloc!.lng, p._geoloc!.lat] },
      properties: {
        user_id: p.user_id,
        label: (p.business_name ?? p.first_name)?.[0]?.toUpperCase() ?? '?',
        name: p.business_name ?? p.first_name + ' ' + p.last_name,
        rating: p.rating_average,
        price: p.hourly_rate,
      },
    })),
  }

  function handleRegionChange(feature: any) {
    const center = feature.properties.center as [number, number]
    const bounds = feature.properties.visibleBounds as [[number, number], [number, number]]
    if (!center || !bounds) return
    const lngDiff = Math.abs(bounds[0][0] - bounds[1][0])
    const latDiff = Math.abs(bounds[0][1] - bounds[1][1])
    const radiusMetres = (Math.sqrt(lngDiff ** 2 + latDiff ** 2) / 2) * 111_000
    onRegionChange(center[1], center[0], radiusMetres)
  }

  const cameraRef = { lat: userLocation?.lat ?? DEFAULT_CENTER[1], lng: userLocation?.lng ?? DEFAULT_CENTER[0] }

  return (
    <MapView
      style={s.map}
      styleURL="mapbox://styles/mapbox/light-v11"
      onRegionDidChange={handleRegionChange}
      compassEnabled
      attributionEnabled={false}
      logoEnabled={false}
    >
      <Camera
        centerCoordinate={[cameraRef.lng, cameraRef.lat]}
        zoomLevel={11}
        animationMode="flyTo"
        animationDuration={600}
      />

      {/* User location dot */}
      {userLocation && <UserLocation renderMode="native" visible />}

      {/* Provider pins with built-in clustering */}
      <ShapeSource
        id="providers"
        shape={geojson}
        cluster
        clusterRadius={50}
        clusterMaxZoomLevel={14}
        onPress={(e: any) => {
          const feature = e?.features?.[0]
          if (!feature) return
          if (feature.properties?.cluster) return // zoom in on cluster tap
          const userId = feature.properties?.user_id
          if (userId) onProviderPress(userId)
        }}
      >
        {/* Cluster circles */}
        <CircleLayer
          id="cluster-circles"
          belowLayerID="cluster-count"
          filter={['has', 'point_count']}
          style={{
            circleColor: '#1a56db',
            circleRadius: ['step', ['get', 'point_count'], 20, 5, 26, 20, 32],
            circleOpacity: 0.9,
            circleStrokeWidth: 3,
            circleStrokeColor: '#ffffff',
          }}
        />
        <SymbolLayer
          id="cluster-count"
          filter={['has', 'point_count']}
          style={{
            textField: '{point_count_abbreviated}',
            textSize: 13,
            textColor: '#ffffff',
            textFont: ['DIN Offc Pro Bold'],
          }}
        />

        {/* Individual provider markers */}
        <CircleLayer
          id="provider-circles"
          filter={['!', ['has', 'point_count']]}
          style={{
            circleColor: '#ffffff',
            circleRadius: 18,
            circleStrokeWidth: 2,
            circleStrokeColor: '#1a56db',
          }}
        />
        <SymbolLayer
          id="provider-labels"
          filter={['!', ['has', 'point_count']]}
          style={{
            textField: ['get', 'label'],
            textSize: 14,
            textColor: '#1a56db',
            textFont: ['DIN Offc Pro Bold'],
          }}
        />
      </ShapeSource>
    </MapView>
  )
}

export default ProviderMapView

const s = StyleSheet.create({
  map: { flex: 1 },
  placeholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f3f4f6', margin: 16, borderRadius: 16, padding: 32,
  },
  placeholderTitle: { fontSize: 17, fontWeight: '700', color: '#374151' },
  placeholderDesc: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 8, lineHeight: 18 },
  placeholderCount: { fontSize: 13, fontWeight: '600', color: '#1a56db', marginTop: 16 },
})
