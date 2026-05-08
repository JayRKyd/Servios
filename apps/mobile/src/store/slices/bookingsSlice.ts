import type { StateCreator } from 'zustand'
import { bookingsApi } from '@/services/api/bookings.api'
import type { Booking } from '@/types'
import type { AppStore } from '../store'

export interface BookingsSlice {
  bookings: Booking[]
  selectedBooking: Booking | null
  bookingsLoading: boolean
  bookingsError: string | null
  fetchBookings: (filters?: { status?: string }) => Promise<void>
  fetchBooking: (id: string) => Promise<void>
  acceptBooking: (id: string) => Promise<void>
  rejectBooking: (id: string, reason?: string) => Promise<void>
  completeBooking: (id: string) => Promise<void>
  cancelBooking: (id: string, reason?: string) => Promise<void>
  clearBookingsError: () => void
}

export const createBookingsSlice: StateCreator<AppStore, [], [], BookingsSlice> = (set, get) => ({
  bookings: [],
  selectedBooking: null,
  bookingsLoading: false,
  bookingsError: null,

  fetchBookings: async (filters) => {
    const { session } = get()
    if (!session) return
    set({ bookingsLoading: true, bookingsError: null })
    try {
      const res = await bookingsApi.list(session.access_token, filters)
      set({ bookings: res.data, bookingsLoading: false })
    } catch (err) {
      set({ bookingsError: err instanceof Error ? err.message : 'Failed to load bookings', bookingsLoading: false })
    }
  },

  fetchBooking: async (id) => {
    const { session } = get()
    if (!session) return
    set({ bookingsLoading: true, bookingsError: null })
    try {
      const booking = await bookingsApi.get(id, session.access_token)
      set({ selectedBooking: booking, bookingsLoading: false })
    } catch (err) {
      set({ bookingsError: err instanceof Error ? err.message : 'Failed to load booking', bookingsLoading: false })
    }
  },

  acceptBooking: async (id) => {
    const { session } = get()
    if (!session) return
    const updated = await bookingsApi.accept(id, session.access_token)
    set((state) => ({
      bookings: state.bookings.map((b) => (b.id === id ? updated : b)),
      selectedBooking: state.selectedBooking?.id === id ? updated : state.selectedBooking,
    }))
  },

  rejectBooking: async (id, reason) => {
    const { session } = get()
    if (!session) return
    const updated = await bookingsApi.reject(id, session.access_token, reason)
    set((state) => ({
      bookings: state.bookings.map((b) => (b.id === id ? updated : b)),
      selectedBooking: state.selectedBooking?.id === id ? updated : state.selectedBooking,
    }))
  },

  completeBooking: async (id) => {
    const { session } = get()
    if (!session) return
    const updated = await bookingsApi.complete(id, session.access_token)
    set((state) => ({
      bookings: state.bookings.map((b) => (b.id === id ? updated : b)),
      selectedBooking: state.selectedBooking?.id === id ? updated : state.selectedBooking,
    }))
  },

  cancelBooking: async (id, reason) => {
    const { session } = get()
    if (!session) return
    const updated = await bookingsApi.cancel(id, session.access_token, reason)
    set((state) => ({
      bookings: state.bookings.map((b) => (b.id === id ? updated : b)),
      selectedBooking: state.selectedBooking?.id === id ? updated : state.selectedBooking,
    }))
  },

  clearBookingsError: () => set({ bookingsError: null }),
})
