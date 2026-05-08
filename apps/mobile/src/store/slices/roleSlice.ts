import type { StateCreator } from 'zustand'
import { authApi } from '@/services/api/auth.api'
import type { Role } from '@/types'
import type { AppStore } from '../store'

export interface RoleSlice {
  activeRole: Role
  availableRoles: Role[]
  isSwitchingRole: boolean
  switchRole: (role: Role) => Promise<void>
}

export const createRoleSlice: StateCreator<AppStore, [], [], RoleSlice> = (set, get) => ({
  activeRole: 'customer',
  availableRoles: ['customer'],
  isSwitchingRole: false,

  switchRole: async (role) => {
    const { session, availableRoles } = get()
    if (!session) throw new Error('Not authenticated')
    if (!availableRoles.includes(role)) throw new Error(`You do not have the ${role} role`)

    set({ isSwitchingRole: true })
    try {
      const user = await authApi.switchRole(role, session.access_token)
      set({ activeRole: user.active_role, user, isSwitchingRole: false })
    } catch (err) {
      set({ isSwitchingRole: false })
      throw err
    }
  },
})
