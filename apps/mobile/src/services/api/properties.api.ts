import { apiRequest } from './client'
import type { Property, PaginatedResponse } from '@/types'

export const propertiesApi = {
  async list(token: string): Promise<PaginatedResponse<Property>> {
    return apiRequest<PaginatedResponse<Property>>('/api/v1/properties', { token })
  },

  async get(id: string, token: string): Promise<Property> {
    return apiRequest<Property>(`/api/v1/properties/${id}`, { token })
  },

  async create(
    body: Omit<Property, 'id' | 'landlord_id' | 'created_at'>,
    token: string
  ): Promise<Property> {
    return apiRequest<Property>('/api/v1/properties', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    })
  },

  async update(
    id: string,
    body: Partial<Omit<Property, 'id' | 'landlord_id' | 'created_at'>>,
    token: string
  ): Promise<Property> {
    return apiRequest<Property>(`/api/v1/properties/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(body),
    })
  },

  async getHistory(id: string, token: string) {
    return apiRequest(`/api/v1/properties/${id}/history`, { token })
  },
}
