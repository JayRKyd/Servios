import { supabase } from '@/lib/supabase'
import { apiRequest } from './client'
import type { UserProfile, Role } from '@/types'

export const authApi = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    return data
  },

  async signUp(email: string, password: string, meta: { full_name: string; phone?: string; role: Role }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: meta.full_name,
          phone: meta.phone,
          roles: [meta.role],
          active_role: meta.role,
        },
      },
    })
    if (error) throw new Error(error.message)
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw new Error(error.message)
  },

  async getMe(token: string): Promise<UserProfile> {
    return apiRequest<UserProfile>('/api/v1/auth/me', { token })
  },

  async switchRole(role: Role, token: string): Promise<UserProfile> {
    return apiRequest<UserProfile>('/api/v1/auth/switch-role', {
      method: 'POST',
      token,
      body: JSON.stringify({ role }),
    })
  },
}
