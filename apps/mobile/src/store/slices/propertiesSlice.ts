import type { StateCreator } from 'zustand'
import { propertiesApi } from '@/services/api/properties.api'
import { maintenanceApi } from '@/services/api/maintenance.api'
import type { Property, MaintenanceRequest } from '@/types'
import type { AppStore } from '../store'

export interface PropertiesSlice {
  properties: Property[]
  selectedProperty: Property | null
  maintenanceRequests: MaintenanceRequest[]
  selectedMaintenance: MaintenanceRequest | null
  propertiesLoading: boolean
  propertiesError: string | null
  fetchProperties: () => Promise<void>
  fetchProperty: (id: string) => Promise<void>
  fetchMaintenance: (propertyId?: string) => Promise<void>
  fetchMaintenanceRequest: (id: string) => Promise<void>
  clearPropertiesError: () => void
}

export const createPropertiesSlice: StateCreator<AppStore, [], [], PropertiesSlice> = (set, get) => ({
  properties: [],
  selectedProperty: null,
  maintenanceRequests: [],
  selectedMaintenance: null,
  propertiesLoading: false,
  propertiesError: null,

  fetchProperties: async () => {
    const { session } = get()
    if (!session) return
    set({ propertiesLoading: true, propertiesError: null })
    try {
      const res = await propertiesApi.list(session.access_token)
      set({ properties: res.data, propertiesLoading: false })
    } catch (err) {
      set({ propertiesError: err instanceof Error ? err.message : 'Failed to load properties', propertiesLoading: false })
    }
  },

  fetchProperty: async (id) => {
    const { session } = get()
    if (!session) return
    set({ propertiesLoading: true })
    try {
      const property = await propertiesApi.get(id, session.access_token)
      set({ selectedProperty: property, propertiesLoading: false })
    } catch (err) {
      set({ propertiesError: err instanceof Error ? err.message : 'Failed to load property', propertiesLoading: false })
    }
  },

  fetchMaintenance: async (propertyId) => {
    const { session } = get()
    if (!session) return
    set({ propertiesLoading: true })
    try {
      const res = await maintenanceApi.list(session.access_token, propertyId)
      set({ maintenanceRequests: res.data, propertiesLoading: false })
    } catch (err) {
      set({ propertiesError: err instanceof Error ? err.message : 'Failed to load maintenance', propertiesLoading: false })
    }
  },

  fetchMaintenanceRequest: async (id) => {
    const { session } = get()
    if (!session) return
    try {
      const req = await maintenanceApi.get(id, session.access_token)
      set({ selectedMaintenance: req })
    } catch (err) {
      set({ propertiesError: err instanceof Error ? err.message : 'Failed to load request' })
    }
  },

  clearPropertiesError: () => set({ propertiesError: null }),
})
