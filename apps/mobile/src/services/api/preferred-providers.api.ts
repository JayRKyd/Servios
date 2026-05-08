import { apiRequest } from './client'

export interface PreferredProviderProfile {
  user_id: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  categories: string[]
  rating_average: number | null
  hourly_rate: number | null
  island: string | null
  is_verified: boolean
}

export interface PreferredProvider {
  id: string
  notes: string | null
  created_at: string
  provider: PreferredProviderProfile
}

export const preferredProvidersApi = {
  list: (token: string) =>
    apiRequest<{ preferred_providers: PreferredProvider[] }>('/api/v1/preferred-providers', { token }),

  add: (token: string, providerId: string, notes?: string) =>
    apiRequest<{ preferred_provider: PreferredProvider }>('/api/v1/preferred-providers', {
      method: 'POST',
      token,
      body: JSON.stringify({ providerId, notes }),
    }),

  updateNotes: (token: string, providerId: string, notes: string | null) =>
    apiRequest<{ preferred_provider: PreferredProvider }>(`/api/v1/preferred-providers/${providerId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ notes }),
    }),

  remove: (token: string, providerId: string) =>
    apiRequest<{ success: boolean }>(`/api/v1/preferred-providers/${providerId}`, {
      method: 'DELETE',
      token,
    }),

  check: (token: string, providerId: string) =>
    apiRequest<{ is_preferred: boolean }>(`/api/v1/preferred-providers/check/${providerId}`, { token }),
}
