/**
 * Servios Test Seed Script
 * Creates test accounts and data for all E2E test flows.
 *
 * Run: bun run packages/database/seeds/seed.ts
 *
 * Requires env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PASSWORD = 'TestPass123!'

const TEST_USERS = [
  {
    email: 'test.customer@servios.test',
    role: 'customer' as const,
    firstName: 'Casey',
    lastName: 'Customer',
    phone: '+12425550001',
  },
  {
    email: 'test.provider@servios.test',
    role: 'provider' as const,
    firstName: 'Pete',
    lastName: 'Provider',
    phone: '+12425550002',
    businessName: 'Pete\'s Plumbing Co',
    trade: 'plumber',
  },
  {
    email: 'test.landlord@servios.test',
    role: 'landlord' as const,
    firstName: 'Larry',
    lastName: 'Landlord',
    phone: '+12425550003',
  },
  {
    email: 'test.tenant@servios.test',
    role: 'tenant' as const,
    firstName: 'Tina',
    lastName: 'Tenant',
    phone: '+12425550004',
  },
  {
    email: 'test.admin@servios.test',
    role: 'admin' as const,
    firstName: 'Adam',
    lastName: 'Admin',
    phone: '+12425550005',
  },
  {
    email: 'test.multirole@servios.test',
    role: 'customer' as const,
    extraRoles: ['provider'],
    firstName: 'Max',
    lastName: 'Multirole',
    phone: '+12425550006',
    businessName: 'Max\'s Services',
    trade: 'handyman',
  },
]

async function upsertAuthUser(email: string) {
  // Check if user exists
  const { data: existing } = await supabase.auth.admin.listUsers()
  const found = existing?.users?.find(u => u.email === email)
  if (found) {
    console.log(`  ↻  Auth user exists: ${email}`)
    return found.id
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    phone_confirm: true,
  })
  if (error) throw new Error(`createUser ${email}: ${error.message}`)
  console.log(`  ✓  Created auth user: ${email}`)
  return data.user.id
}

async function seed() {
  console.log('\n🌱  Seeding Servios test data…\n')

  const ids: Record<string, string> = {}

  // ── 1. Create auth users ────────────────────────────────────────────────────
  for (const u of TEST_USERS) {
    ids[u.email] = await upsertAuthUser(u.email)
  }

  const customerId  = ids['test.customer@servios.test']
  const providerId  = ids['test.provider@servios.test']
  const landlordId  = ids['test.landlord@servios.test']
  const tenantId    = ids['test.tenant@servios.test']
  const adminId     = ids['test.admin@servios.test']
  const multiId     = ids['test.multirole@servios.test']

  // ── 2. Upsert users table ───────────────────────────────────────────────────
  const usersRows = [
    { id: customerId,  email: 'test.customer@servios.test',  phone: '+12425550001', roles: ['customer'],            active_role: 'customer',  primary_role: 'customer'  },
    { id: providerId,  email: 'test.provider@servios.test',  phone: '+12425550002', roles: ['provider'],            active_role: 'provider',  primary_role: 'provider'  },
    { id: landlordId,  email: 'test.landlord@servios.test',  phone: '+12425550003', roles: ['landlord'],            active_role: 'landlord',  primary_role: 'landlord'  },
    { id: tenantId,    email: 'test.tenant@servios.test',    phone: '+12425550004', roles: ['tenant'],              active_role: 'tenant',    primary_role: 'tenant'    },
    { id: adminId,     email: 'test.admin@servios.test',     phone: '+12425550005', roles: ['admin'],               active_role: 'admin',     primary_role: 'admin'     },
    { id: multiId,     email: 'test.multirole@servios.test', phone: '+12425550006', roles: ['customer','provider'], active_role: 'customer',  primary_role: 'customer'  },
  ]

  const { error: usersErr } = await supabase.from('users').upsert(usersRows, { onConflict: 'id' })
  if (usersErr) throw new Error(`users upsert: ${usersErr.message}`)
  console.log('  ✓  users rows')

  // ── 3. Customer profile ─────────────────────────────────────────────────────
  await supabase.from('customer_profiles').upsert([
    { user_id: customerId, first_name: 'Casey', last_name: 'Customer' },
    { user_id: multiId,    first_name: 'Max',   last_name: 'Multirole' },
  ], { onConflict: 'user_id' })
  console.log('  ✓  customer_profiles')

  // ── 4. Provider profiles ────────────────────────────────────────────────────
  await supabase.from('provider_profiles').upsert([
    {
      user_id:        providerId,
      first_name:     'Pete',
      last_name:      'Provider',
      business_name:  "Pete's Plumbing Co",
      phone:          '+12425550002',
      islands:        ['New Providence'],
      is_verified:    true,
      is_active:      true,
      verified_at:    new Date().toISOString(),
      trade_category: 'plumber',
      onboarding_complete: true,
      onboarding_step: 'complete',
      rating_average: 4.8,
      rating_count:   12,
    },
    {
      user_id:        multiId,
      first_name:     'Max',
      last_name:      'Multirole',
      business_name:  "Max's Services",
      phone:          '+12425550006',
      islands:        ['New Providence'],
      is_verified:    true,
      is_active:      true,
      verified_at:    new Date().toISOString(),
      trade_category: 'handyman',
      onboarding_complete: true,
      onboarding_step: 'complete',
      rating_average: 4.5,
      rating_count:   3,
    },
  ], { onConflict: 'user_id' })
  console.log('  ✓  provider_profiles')

  // ── 5. Landlord profile ─────────────────────────────────────────────────────
  await supabase.from('landlord_profiles').upsert([
    {
      user_id:                landlordId,
      first_name:             'Larry',
      last_name:              'Landlord',
      phone:                  '+12425550003',
      auto_approve_threshold: 150,   // auto-approve under $150
    },
  ], { onConflict: 'user_id' })
  console.log('  ✓  landlord_profiles')

  // ── 6. Tenant profile ───────────────────────────────────────────────────────
  await supabase.from('tenant_profiles').upsert([
    { user_id: tenantId, first_name: 'Tina', last_name: 'Tenant', phone: '+12425550004' },
  ], { onConflict: 'user_id' })
  console.log('  ✓  tenant_profiles')

  // ── 7. Property ─────────────────────────────────────────────────────────────
  const { data: propData, error: propErr } = await supabase
    .from('properties')
    .upsert([{
      landlord_id:   landlordId,
      name:          'Test Villa',
      property_type: 'residential',
      address:       { street: '42 Test Lane', city: 'Nassau', island: 'New Providence', postalCode: 'NP-001' },
      bedrooms:      3,
      bathrooms:     2,
      is_active:     true,
    }], { onConflict: 'name' })
    .select('id')
    .single()

  // Fetch property id (upsert may not return id on conflict)
  const { data: propRow } = await supabase
    .from('properties')
    .select('id')
    .eq('landlord_id', landlordId)
    .eq('name', 'Test Villa')
    .single()

  const propertyId = propRow?.id
  if (!propertyId) throw new Error('Could not get property id')
  console.log(`  ✓  property: ${propertyId}`)

  // ── 8. Tenant ↔ Property link ───────────────────────────────────────────────
  await supabase.from('tenants').upsert([{
    property_id: propertyId,
    landlord_id: landlordId,
    user_id:     tenantId,
    first_name:  'Tina',
    last_name:   'Tenant',
    email:       'test.tenant@servios.test',
    phone:       '+12425550004',
    lease_start: '2025-01-01',
    lease_end:   '2026-01-01',
    is_active:   true,
  }], { onConflict: 'user_id,property_id' }).catch(() => {
    // ignore unique constraint if already exists
  })
  console.log('  ✓  tenants (tenant linked to property)')

  // ── 9. Landlord ↔ Provider relationship ────────────────────────────────────
  await supabase.from('landlord_provider_relationships').upsert([{
    landlord_id:           landlordId,
    provider_id:           providerId,
    relationship_type:     'invited',
    custom_commission_rate: 10.0,
    is_active:             true,
  }], { onConflict: 'landlord_id,provider_id' })
  console.log('  ✓  landlord_provider_relationships')

  // ── 10. Provider services ───────────────────────────────────────────────────
  const { data: services } = await supabase
    .from('services')
    .select('id, title')
    .in('title', ['Plumbing Repair', 'Pipe Installation', 'Handyman Services'])

  if (services && services.length > 0) {
    const plumbingService = services.find(s => s.title === 'Plumbing Repair')
    const handymanService = services.find(s => s.title === 'Handyman Services')

    const providerServicesRows: any[] = []
    if (plumbingService) {
      providerServicesRows.push({ provider_id: providerId, service_id: plumbingService.id, base_price: 120, price_type: 'fixed', is_active: true })
    }
    if (handymanService) {
      providerServicesRows.push({ provider_id: multiId, service_id: handymanService.id, base_price: 80, price_type: 'hourly', is_active: true })
    }
    if (providerServicesRows.length > 0) {
      await supabase.from('provider_services').upsert(providerServicesRows, { onConflict: 'provider_id,service_id' })
    }
    console.log('  ✓  provider_services')
  }

  // ── 11. Seed a completed booking (for review/claim tests) ───────────────────
  const { data: plumbingService } = await supabase
    .from('services')
    .select('id')
    .eq('title', 'Plumbing Repair')
    .single()

  if (plumbingService) {
    const completedBookingNum = 'TEST-BOOKING-001'
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('id')
      .eq('booking_number', completedBookingNum)
      .single()

    if (!existingBooking) {
      await supabase.from('bookings').insert({
        booking_number:      completedBookingNum,
        customer_id:         customerId,
        provider_id:         providerId,
        service_id:          plumbingService.id,
        payer_id:            customerId,
        scheduled_date:      '2026-03-01',
        scheduled_time_start: '10:00',
        service_address:     { street: '42 Test Lane', city: 'Nassau', island: 'New Providence' },
        status:              'completed',
        booking_type:        'direct_customer',
        base_amount:         120,
        platform_fee:        14.40,
        total_amount:        120,
        commission_rate:     12,
        payment_status:      'paid',
        completed_at:        new Date().toISOString(),
      })
      console.log('  ✓  completed booking (TEST-BOOKING-001)')
    } else {
      console.log('  ↻  completed booking already exists')
    }
  }

  // ── 12. Seed a pending booking (for provider accept/reject tests) ───────────
  if (plumbingService) {
    const pendingBookingNum = 'TEST-BOOKING-002'
    const { data: existingPending } = await supabase
      .from('bookings')
      .select('id')
      .eq('booking_number', pendingBookingNum)
      .single()

    if (!existingPending) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      await supabase.from('bookings').insert({
        booking_number:      pendingBookingNum,
        customer_id:         customerId,
        provider_id:         providerId,
        service_id:          plumbingService.id,
        payer_id:            customerId,
        scheduled_date:      tomorrow.toISOString().split('T')[0],
        scheduled_time_start: '14:00',
        service_address:     { street: '10 Customer Rd', city: 'Nassau', island: 'New Providence' },
        status:              'pending',
        booking_type:        'direct_customer',
        base_amount:         120,
        platform_fee:        14.40,
        total_amount:        120,
        commission_rate:     12,
        payment_status:      'unpaid',
        customer_notes:      'Leaking kitchen tap, please bring replacement parts',
      })
      console.log('  ✓  pending booking (TEST-BOOKING-002)')
    } else {
      console.log('  ↻  pending booking already exists')
    }
  }

  // ── 13. Property compliance items ───────────────────────────────────────────
  const expirySoon = new Date()
  expirySoon.setDate(expirySoon.getDate() + 25) // 25 days from now (inside 30-day reminder)

  await supabase.from('property_compliance').upsert([
    { property_id: propertyId, item: 'Gas Safe Certificate', category: 'gas',      status: 'compliant', due_date: expirySoon.toISOString().split('T')[0] },
    { property_id: propertyId, item: 'EICR',                 category: 'electric', status: 'compliant', due_date: '2027-01-01' },
    { property_id: propertyId, item: 'EPC',                  category: 'energy',   status: 'overdue',   due_date: '2025-12-01' },
  ], { onConflict: 'property_id,item' }).catch(() => {})
  console.log('  ✓  property_compliance')

  console.log('\n✅  Seed complete!\n')
  console.log('Test credentials (password: TestPass123! for all):')
  console.log('  Customer:   test.customer@servios.test')
  console.log('  Provider:   test.provider@servios.test  (verified plumber)')
  console.log('  Landlord:   test.landlord@servios.test  (auto-approve ≤ $150)')
  console.log('  Tenant:     test.tenant@servios.test    (linked to Test Villa)')
  console.log('  Admin:      test.admin@servios.test')
  console.log('  Multi-role: test.multirole@servios.test (customer + provider)\n')
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message)
  process.exit(1)
})
