import { apiRequest } from './client'
import type { MaintenanceRequest, PaginatedResponse } from '@/types'

export const maintenanceApi = {
  async list(token: string, propertyId?: string): Promise<PaginatedResponse<MaintenanceRequest>> {
    const qs = propertyId ? `?property_id=${propertyId}` : ''
    return apiRequest<PaginatedResponse<MaintenanceRequest>>(`/api/v1/maintenance${qs}`, { token })
  },

  async get(id: string, token: string): Promise<MaintenanceRequest> {
    return apiRequest<MaintenanceRequest>(`/api/v1/maintenance/${id}`, { token })
  },

  async create(
    body: {
      property_id: string
      title: string
      description: string
      priority: 'low' | 'medium' | 'high' | 'emergency'
      category?: string
      photos?: string[]
    },
    token: string
  ): Promise<MaintenanceRequest> {
    return apiRequest<MaintenanceRequest>('/api/v1/maintenance', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    })
  },

  async approve(
    id: string,
    token: string,
    body?: { service_id?: string; provider_id?: string; scheduled_date?: string }
  ): Promise<MaintenanceRequest> {
    return apiRequest<MaintenanceRequest>(`/api/v1/maintenance/${id}/approve`, {
      method: 'POST',
      token,
      body: JSON.stringify(body ?? {}),
    })
  },
}
