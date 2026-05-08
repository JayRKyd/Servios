import { create } from 'zustand'
import { createAuthSlice, type AuthSlice } from './slices/authSlice'
import { createRoleSlice, type RoleSlice } from './slices/roleSlice'
import { createBookingsSlice, type BookingsSlice } from './slices/bookingsSlice'
import { createMessagesSlice, type MessagesSlice } from './slices/messagesSlice'
import { createPropertiesSlice, type PropertiesSlice } from './slices/propertiesSlice'

export type AppStore = AuthSlice & RoleSlice & BookingsSlice & MessagesSlice & PropertiesSlice

export const useStore = create<AppStore>()((...a) => ({
  ...createAuthSlice(...a),
  ...createRoleSlice(...a),
  ...createBookingsSlice(...a),
  ...createMessagesSlice(...a),
  ...createPropertiesSlice(...a),
}))

// Typed selectors for common use cases
export const useAuth = () => useStore((s) => ({
  session: s.session,
  user: s.user,
  isLoading: s.isLoading,
  isAuthenticated: s.isAuthenticated,
  signIn: s.signIn,
  signUp: s.signUp,
  signOut: s.signOut,
  resetPassword: s.resetPassword,
  loadSession: s.loadSession,
  refreshUser: s.refreshUser,
}))

export const useRole = () => useStore((s) => ({
  activeRole: s.activeRole,
  availableRoles: s.availableRoles,
  isSwitchingRole: s.isSwitchingRole,
  switchRole: s.switchRole,
}))

export const useBookings = () => useStore((s) => ({
  bookings: s.bookings,
  selectedBooking: s.selectedBooking,
  isLoading: s.bookingsLoading,
  error: s.bookingsError,
  fetchBookings: s.fetchBookings,
  fetchBooking: s.fetchBooking,
  acceptBooking: s.acceptBooking,
  rejectBooking: s.rejectBooking,
  completeBooking: s.completeBooking,
  cancelBooking: s.cancelBooking,
  clearError: s.clearBookingsError,
}))

export const useMessages = () => useStore((s) => ({
  conversations: s.conversations,
  activeConversation: s.activeConversation,
  messages: s.messages,
  isLoading: s.messagesLoading,
  error: s.messagesError,
  fetchConversations: s.fetchConversations,
  openConversation: s.openConversation,
  sendMessage: s.sendMessage,
  clearError: s.clearMessagesError,
}))

export const useProperties = () => useStore((s) => ({
  properties: s.properties,
  selectedProperty: s.selectedProperty,
  maintenanceRequests: s.maintenanceRequests,
  selectedMaintenance: s.selectedMaintenance,
  isLoading: s.propertiesLoading,
  error: s.propertiesError,
  fetchProperties: s.fetchProperties,
  fetchProperty: s.fetchProperty,
  fetchMaintenance: s.fetchMaintenance,
  fetchMaintenanceRequest: s.fetchMaintenanceRequest,
  clearError: s.clearPropertiesError,
}))
