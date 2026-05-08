import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { authRoutes } from './routes/auth'
import { userRoutes } from './routes/users'
import { bookingRoutes } from './routes/bookings'
import { propertyRoutes } from './routes/properties'
import { maintenanceRoutes } from './routes/maintenance'
import { messageRoutes } from './routes/messages'
import { invitationRoutes } from './routes/invitations'
import { paymentRoutes } from './routes/payments'
import { reviewRoutes } from './routes/reviews'
import { providerRoutes } from './routes/providers'
import { serviceRoutes } from './routes/services'
import { connectRoutes } from './routes/connect'
import { milestoneRoutes } from './routes/milestones'
import { pushTokenRoutes } from './routes/push-tokens'
import { searchRoutes } from './routes/search'
import { photoRoutes } from './routes/photos'
import { preferredProviderRoutes } from './routes/preferred-providers'
import { onboardingRoutes } from './routes/onboarding'
import { claimRoutes } from './routes/claims'
import { offerRoutes } from './routes/offers'
import { settingsRoutes } from './routes/settings'
import { errorHandler } from './middleware/error'

const app = new Hono()

// Global middleware
app.use('*', logger())
app.use('*', prettyJSON())
app.use('*', cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}))

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// API routes
app.route('/api/v1/auth', authRoutes)
app.route('/api/v1/users', userRoutes)
app.route('/api/v1/bookings', bookingRoutes)
// Milestone sub-routes: /api/v1/bookings/:bookingId/milestones[/...]
app.route('/api/v1/bookings', milestoneRoutes)
app.route('/api/v1/properties', propertyRoutes)
app.route('/api/v1/maintenance', maintenanceRoutes)
app.route('/api/v1/messages', messageRoutes)
app.route('/api/v1/invitations', invitationRoutes)
app.route('/api/v1/payments', paymentRoutes)
app.route('/api/v1/reviews', reviewRoutes)
app.route('/api/v1/providers', providerRoutes)
app.route('/api/v1/services', serviceRoutes)
app.route('/api/v1/connect', connectRoutes)
app.route('/api/v1/push-tokens', pushTokenRoutes)
app.route('/api/v1/search', searchRoutes)
// Photo sub-routes: /api/v1/bookings/:bookingId/photos[/...]
app.route('/api/v1/bookings', photoRoutes)
app.route('/api/v1/preferred-providers', preferredProviderRoutes)
app.route('/api/v1/onboarding', onboardingRoutes)
app.route('/api/v1/claims', claimRoutes)
app.route('/api/v1/conversations', offerRoutes)
app.route('/api/v1/settings', settingsRoutes)

// Error handler (must be last)
app.onError(errorHandler)

// 404 handler
app.notFound((c) => c.json({ error: 'Not Found' }, 404))

const port = Number(process.env.PORT ?? 4000)
console.log(`🚀 Servios API running on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
