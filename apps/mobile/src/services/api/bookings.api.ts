import { apiRequest } from './client'
import type { Booking, PaginatedResponse } from '@/types'

export const bookingsApi = {
  async list(token: string, params?: { status?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Booking>> {
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
    if (params?.page) qs.set('page', String(params.page))
    if (params?.limit) qs.set('limit', String(params.limit))
    const query = qs.toString() ? '?' + qs : ''
    return apiRequest<PaginatedResponse<Booking>>('/api/v1/bookings' + query, { token })
  },

  async get(id: string, token: string): Promise<Booking> {
    return apiRequest<Booking>('/api/v1/bookings/' + id, { token })
  },

  async create(
    body: {
      service_id: string
      provider_id: string
      scheduled_date: string
      scheduled_time_start: string
      scheduled_time_end?: string
      customer_notes?: string
      is_emergency?: boolean
      property_id?: string
      tenant_id?: string
    },
    token: string
  ): Promise<Booking> {
    return apiRequest<Booking>('/api/v1/bookings', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    })
  },

  async accept(id: string, token: string): Promise<Booking> {
    return apiRequest<Booking>('/api/v1/bookings/' + id + '/accept', { method: 'PUT', token })
  },

  async reject(id: string, token: string, reason?: string): Promise<Booking> {
    return apiRequest<Booking>('/api/v1/bookings/' + id + '/reject', {
      method: 'PUT', token,
      body: JSON.stringify({ reason }),
    })
  },

  async start(id: string, token: string): Promise<Booking> {
    return apiRequest<Booking>('/api/v1/bookings/' + id + '/start', { method: 'PUT', token })
  },

  async complete(id: string, token: string): Promise<Booking> {
    return apiRequest<Booking>('/api/v1/bookings/' + id + '/complete', { method: 'PUT', token })
  },

  async cancel(id: string, token: string, reason?: string): Promise<Booking> {
    return apiRequest<Booking>('/api/v1/bookings/' + id + '/cancel', {
      method: 'PUT', token,
      body: JSON.stringify({ reason }),
    })
  },

  // ── Payments ──────────────────────────────────────────────────────────────

  /** Create PaymentIntent (escrow hold). Returns Stripe client secret. */
  async createPaymentIntent(bookingId: string, token: string): Promise<{ clientSecret: string }> {
    return apiRequest<{ clientSecret: string }>('/api/v1/payments/intent', {
      method: 'POST', token,
      body: JSON.stringify({ bookingId }),
    })
  },

  /** Capture held funds (release escrow to provider). */
  async capturePayment(paymentId: string, token: string): Promise<{ captured: boolean }> {
    return apiRequest<{ captured: boolean }>('/api/v1/payments/capture/' + paymentId, {
      method: 'POST', token,
    })
  },

  /** Get payment record for a booking. */
  async getPayment(bookingId: string, token: string): Promise<{ payment: any }> {
    return apiRequest<{ payment: any }>('/api/v1/payments/booking/' + bookingId, { token })
  },

  /** Refund or cancel a payment. */
  async refundPayment(paymentId: string, token: string, reason?: string): Promise<any> {
    return apiRequest('/api/v1/payments/refund/' + paymentId, {
      method: 'POST', token,
      body: JSON.stringify({ reason }),
    })
  },

  // ── Milestones ────────────────────────────────────────────────────────────

  async getMilestones(bookingId: string, token: string): Promise<{ milestones: any[] }> {
    return apiRequest('/api/v1/bookings/' + bookingId + '/milestones', { token })
  },

  async createMilestone(
    bookingId: string,
    milestone: { title: string; amountCents: number; description?: string; dueDate?: string },
    token: string
  ): Promise<{ milestone: any }> {
    return apiRequest('/api/v1/bookings/' + bookingId + '/milestones', {
      method: 'POST', token,
      body: JSON.stringify(milestone),
    })
  },

  async releaseMilestone(bookingId: string, milestoneId: string, token: string): Promise<{ released: boolean; transferId: string }> {
    return apiRequest('/api/v1/bookings/' + bookingId + '/milestones/' + milestoneId + '/release', {
      method: 'POST', token,
    })
  },
}
