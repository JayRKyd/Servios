import type { StateCreator } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { authApi } from '@/services/api/auth.api'
import type { UserProfile, Role } from '@/types'
import type { AppStore } from '../store'

export interface AuthSlice {
  session: Session | null
  user: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  loadSession: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, meta: { full_name: string; phone?: string; role: Role }) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  refreshUser: () => Promise<void>
}

export const createAuthSlice: StateCreator<AppStore, [], [], AuthSlice> = (set, get) => ({
  session: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,

  loadSession: async () => {
    set({ isLoading: true })
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      try {
        const user = await authApi.getMe(session.access_token)
        set({ session, user, isAuthenticated: true, activeRole: user.active_role, availableRoles: user.roles })
      } catch {
        set({ session, isAuthenticated: true })
      }
    }
    set({ isLoading: false })

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        set({ session: null, user: null, isAuthenticated: false, activeRole: 'customer', availableRoles: ['customer'] })
        return
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        try {
          const user = await authApi.getMe(session.access_token)
          set({ session, user, isAuthenticated: true, activeRole: user.active_role, availableRoles: user.roles })
        } catch {
          set({ session, isAuthenticated: true })
        }
      }
    })
  },

  signIn: async (email, password) => {
    const data = await authApi.signIn(email, password)
    const user = await authApi.getMe(data.session!.access_token)
    set({ session: data.session, user, isAuthenticated: true, activeRole: user.active_role, availableRoles: user.roles })
  },

  signUp: async (email, password, meta) => {
    await authApi.signUp(email, password, meta)
  },

  signOut: async () => {
    await authApi.signOut()
    set({ session: null, user: null, isAuthenticated: false })
  },

  resetPassword: async (email) => {
    await authApi.resetPassword(email)
  },

  refreshUser: async () => {
    const { session } = get()
    if (!session) return
    const user = await authApi.getMe(session.access_token)
    set({ user, activeRole: user.active_role, availableRoles: user.roles })
  },
})
