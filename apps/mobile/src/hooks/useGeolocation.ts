import { useState, useCallback } from 'react'
import * as Location from 'expo-location'

export type GeoLocation = { lat: number; lng: number }

export function useGeolocation() {
  const [location, setLocation] = useState<GeoLocation | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [granted, setGranted]   = useState(false)

  const requestLocation = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setError('Location permission denied')
        return
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      setGranted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get location')
    } finally {
      setLoading(false)
    }
  }, [])

  return { location, loading, error, granted, requestLocation }
}
