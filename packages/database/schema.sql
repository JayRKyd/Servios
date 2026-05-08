-- ============================================================================
-- SERVIOS DATABASE SCHEMA
-- PostgreSQL / Supabase
-- Run this in the Supabase SQL Editor or via migrations
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('customer', 'provider', 'landlord', 'tenant', 'admin');
CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled');
CREATE TYPE booking_type AS ENUM ('direct_customer', 'landlord_direct', 'tenant_request');
CREATE TYPE payment_status AS ENUM ('unpaid', 'pending', 'paid', 'refunded', 'failed');
CREATE TYPE maintenance_status AS ENUM ('pending', 'approved', 'scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE maintenance_priority AS ENUM ('low', 'medium', 'high', 'emergency');
CREATE TYPE property_type AS ENUM ('residential', 'commercial', 'vacation_rental', 'multi_unit');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'resolved', 'closed');
CREATE TYPE document_type AS ENUM ('insurance', 'license', 'certification', 'id', 'contract', 'other');
CREATE TYPE notification_type AS ENUM (
  'booking_new', 'booking_accepted', 'booking_rejected', 'booking_completed',
  'maintenance_new', 'maintenance_approved',
  'message_new', 'payment_received',
  'invitation_new', 'review_new', 'dispute_new'
);


-- ============================================================================
-- HELPER: updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- USERS
-- Extends Supabase auth.users
-- ============================================================================

CREATE TABLE users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT,
  roles         user_role[] NOT NULL DEFAULT '{customer}',
  active_role   user_role   NOT NULL DEFAULT 'customer',
  primary_role  user_role   NOT NULL DEFAULT 'customer',
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_roles  ON users USING GIN(roles);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- PROFILES
-- ============================================================================

CREATE TABLE customer_profiles (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  first_name        TEXT        NOT NULL,
  last_name         TEXT        NOT NULL,
  avatar_url        TEXT,
  preferred_islands TEXT[],
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_customer_profiles_updated_at
  BEFORE UPDATE ON customer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------------------

CREATE TABLE provider_profiles (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  first_name        TEXT          NOT NULL,
  last_name         TEXT          NOT NULL,
  business_name     TEXT          NOT NULL,
  bio               TEXT,
  avatar_url        TEXT,
  phone             TEXT,
  website           TEXT,
  hourly_rate       DECIMAL(10,2),
  service_radius    INTEGER,                        -- km
  islands           TEXT[]        NOT NULL DEFAULT '{}',
  rating_average    DECIMAL(3,2)  NOT NULL DEFAULT 0,
  rating_count      INTEGER       NOT NULL DEFAULT 0,
  is_verified       BOOLEAN       NOT NULL DEFAULT false,
  is_active         BOOLEAN       NOT NULL DEFAULT true,
  verified_at       TIMESTAMPTZ,
  stripe_account_id TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_provider_profiles_rating   ON provider_profiles(rating_average DESC);
CREATE INDEX idx_provider_profiles_islands  ON provider_profiles USING GIN(islands);
CREATE INDEX idx_provider_profiles_active   ON provider_profiles(is_verified, is_active);

CREATE TRIGGER trg_provider_profiles_updated_at
  BEFORE UPDATE ON provider_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------------------

CREATE TABLE landlord_profiles (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  first_name   TEXT        NOT NULL,
  last_name    TEXT        NOT NULL,
  avatar_url   TEXT,
  company_name TEXT,
  phone        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_landlord_profiles_updated_at
  BEFORE UPDATE ON landlord_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------------------

CREATE TABLE tenant_profiles (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  first_name TEXT        NOT NULL,
  last_name  TEXT        NOT NULL,
  avatar_url TEXT,
  phone      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_tenant_profiles_updated_at
  BEFORE UPDATE ON tenant_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- PROPERTIES
-- ============================================================================

CREATE TABLE properties (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_id   UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT          NOT NULL,
  property_type property_type NOT NULL DEFAULT 'residential',
  -- address: { street, city, island, postalCode, coordinates: { lat, lng } }
  address       JSONB         NOT NULL,
  units         INTEGER,
  bedrooms      INTEGER,
  bathrooms     INTEGER,
  square_feet   INTEGER,
  year_built    INTEGER,
  notes         TEXT,
  is_active     BOOLEAN       NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_properties_landlord ON properties(landlord_id);

CREATE TRIGGER trg_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------------------
-- Tenant ↔ Property (tenants managed by landlord; may or may not have accounts)

CREATE TABLE tenants (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id  UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  landlord_id  UUID        NOT NULL REFERENCES users(id),
  user_id      UUID        REFERENCES users(id) ON DELETE SET NULL, -- null if not on platform
  first_name   TEXT        NOT NULL,
  last_name    TEXT        NOT NULL,
  email        TEXT,
  phone        TEXT,
  unit_number  TEXT,
  lease_start  DATE,
  lease_end    DATE,
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_property  ON tenants(property_id);
CREATE INDEX idx_tenants_user      ON tenants(user_id);
CREATE INDEX idx_tenants_landlord  ON tenants(landlord_id);

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------------------

CREATE TABLE property_compliance (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id    UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  item           TEXT        NOT NULL,
  category       TEXT,
  -- pending | compliant | overdue | not_applicable
  status         TEXT        NOT NULL DEFAULT 'pending',
  due_date       DATE,
  completed_date DATE,
  notes          TEXT,
  document_url   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compliance_property ON property_compliance(property_id);

CREATE TRIGGER trg_property_compliance_updated_at
  BEFORE UPDATE ON property_compliance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- SERVICES
-- ============================================================================

CREATE TABLE services (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT        NOT NULL UNIQUE,
  description TEXT,
  category    TEXT        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_category ON services(category);

-- ----------------------------------------------------------------------------
-- Provider ↔ Service offerings

CREATE TABLE provider_services (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id       UUID        NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  base_price       DECIMAL(10,2),
  -- fixed | hourly | quote
  price_type       TEXT        NOT NULL DEFAULT 'hourly',
  duration_minutes INTEGER,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, service_id)
);

CREATE INDEX idx_provider_services_provider ON provider_services(provider_id);
CREATE INDEX idx_provider_services_service  ON provider_services(service_id);

-- ----------------------------------------------------------------------------

CREATE TABLE availability_slots (
  id           UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id  UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time   TIME    NOT NULL,
  end_time     TIME    NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, day_of_week)
);

CREATE INDEX idx_availability_provider ON availability_slots(provider_id);


-- ============================================================================
-- BOOKINGS
-- ============================================================================

CREATE TABLE bookings (
  id                     UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_number         TEXT           NOT NULL UNIQUE,
  -- Parties
  customer_id            UUID           REFERENCES users(id),
  provider_id            UUID           NOT NULL REFERENCES users(id),
  service_id             UUID           NOT NULL REFERENCES services(id),
  landlord_id            UUID           REFERENCES users(id),
  property_id            UUID           REFERENCES properties(id),
  tenant_id              UUID           REFERENCES users(id),
  maintenance_request_id UUID,          -- FK added after maintenance table
  -- Scheduling
  scheduled_date         DATE           NOT NULL,
  scheduled_time_start   TIME           NOT NULL,
  scheduled_time_end     TIME,
  -- Location
  service_address        JSONB          NOT NULL,
  -- Status
  status                 booking_status NOT NULL DEFAULT 'pending',
  booking_type           booking_type   NOT NULL DEFAULT 'direct_customer',
  -- Financials
  base_amount            DECIMAL(10,2)  NOT NULL,
  travel_fee             DECIMAL(10,2)  NOT NULL DEFAULT 0,
  platform_fee           DECIMAL(10,2)  NOT NULL,
  total_amount           DECIMAL(10,2)  NOT NULL,
  commission_rate        DECIMAL(5,2)   NOT NULL DEFAULT 12.0,
  -- Payment
  payer_type             TEXT           NOT NULL DEFAULT 'customer',
  payer_id               UUID           NOT NULL REFERENCES users(id),
  payment_status         payment_status NOT NULL DEFAULT 'unpaid',
  -- Flags
  is_emergency           BOOLEAN        NOT NULL DEFAULT false,
  -- Notes
  customer_notes         TEXT,
  provider_notes         TEXT,
  -- Timestamps
  accepted_at            TIMESTAMPTZ,
  completed_at           TIMESTAMPTZ,
  cancelled_at           TIMESTAMPTZ,
  cancelled_by           UUID           REFERENCES users(id),
  cancellation_reason    TEXT,
  created_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_customer       ON bookings(customer_id);
CREATE INDEX idx_bookings_provider       ON bookings(provider_id);
CREATE INDEX idx_bookings_landlord       ON bookings(landlord_id);
CREATE INDEX idx_bookings_tenant         ON bookings(tenant_id);
CREATE INDEX idx_bookings_property       ON bookings(property_id);
CREATE INDEX idx_bookings_status         ON bookings(status);
CREATE INDEX idx_bookings_scheduled_date ON bookings(scheduled_date);

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------------------
-- Escrow-style milestones

CREATE TABLE booking_milestones (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT,
  amount      DECIMAL(10,2) NOT NULL,
  order_index INTEGER     NOT NULL,
  -- pending | released | disputed
  status      TEXT        NOT NULL DEFAULT 'pending',
  released_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_milestones_booking ON booking_milestones(booking_id);


-- ============================================================================
-- PAYMENTS
-- ============================================================================

CREATE TABLE payments (
  id                        UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id                UUID          NOT NULL REFERENCES bookings(id),
  stripe_payment_intent_id  TEXT          UNIQUE,
  amount                    DECIMAL(10,2) NOT NULL,
  currency                  TEXT          NOT NULL DEFAULT 'USD',
  status                    TEXT          NOT NULL DEFAULT 'pending',
  payer_id                  UUID          NOT NULL REFERENCES users(id),
  refund_id                 TEXT,
  paid_at                   TIMESTAMPTZ,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_payer   ON payments(payer_id);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- MAINTENANCE REQUESTS
-- ============================================================================

CREATE TABLE maintenance_requests (
  id           UUID                 PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id  UUID                 NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  landlord_id  UUID                 NOT NULL REFERENCES users(id),
  tenant_id    UUID                 REFERENCES users(id),
  reported_by  UUID                 NOT NULL REFERENCES users(id),
  title        TEXT                 NOT NULL,
  description  TEXT                 NOT NULL,
  priority     maintenance_priority NOT NULL DEFAULT 'medium',
  category     TEXT,
  photos       TEXT[]               NOT NULL DEFAULT '{}',
  status       maintenance_status   NOT NULL DEFAULT 'pending',
  booking_id   UUID                 REFERENCES bookings(id),
  approved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maintenance_property ON maintenance_requests(property_id);
CREATE INDEX idx_maintenance_landlord ON maintenance_requests(landlord_id);
CREATE INDEX idx_maintenance_tenant   ON maintenance_requests(tenant_id);
CREATE INDEX idx_maintenance_status   ON maintenance_requests(status);

CREATE TRIGGER trg_maintenance_updated_at
  BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add deferred FK from bookings → maintenance now that both tables exist
ALTER TABLE bookings
  ADD CONSTRAINT fk_bookings_maintenance
  FOREIGN KEY (maintenance_request_id)
  REFERENCES maintenance_requests(id)
  ON DELETE SET NULL;


-- ============================================================================
-- MESSAGES & CONVERSATIONS
-- ============================================================================

CREATE TABLE conversations (
  id                     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id             UUID        REFERENCES bookings(id),
  maintenance_request_id UUID        REFERENCES maintenance_requests(id),
  created_by             UUID        NOT NULL REFERENCES users(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_booking  ON conversations(booking_id);
CREATE INDEX idx_conversations_updated  ON conversations(updated_at DESC);

CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------------------

CREATE TABLE conversation_participants (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_participants_user         ON conversation_participants(user_id);

-- ----------------------------------------------------------------------------

CREATE TABLE messages (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES users(id),
  content         TEXT        NOT NULL,
  attachments     TEXT[]      NOT NULL DEFAULT '{}',
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created      ON messages(created_at DESC);

-- Helper: find existing 1-on-1 conversation between two users
CREATE OR REPLACE FUNCTION find_conversation(user1 UUID, user2 UUID)
RETURNS TABLE(id UUID) AS $$
  SELECT c.id FROM conversations c
  WHERE EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = c.id AND cp.user_id = user1
  )
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = c.id AND cp.user_id = user2
  )
  LIMIT 1;
$$ LANGUAGE sql STABLE;


-- ============================================================================
-- REVIEWS
-- ============================================================================

CREATE TABLE reviews (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID        NOT NULL REFERENCES bookings(id),
  provider_id UUID        NOT NULL REFERENCES users(id),
  reviewer_id UUID        NOT NULL REFERENCES users(id),
  rating      INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id, reviewer_id)
);

CREATE INDEX idx_reviews_provider ON reviews(provider_id);
CREATE INDEX idx_reviews_booking  ON reviews(booking_id);


-- ============================================================================
-- DISPUTES
-- ============================================================================

CREATE TABLE disputes (
  id          UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID           NOT NULL REFERENCES bookings(id),
  raised_by   UUID           NOT NULL REFERENCES users(id),
  reason      TEXT           NOT NULL,
  description TEXT           NOT NULL,
  status      dispute_status NOT NULL DEFAULT 'open',
  admin_notes TEXT,
  resolved_by UUID           REFERENCES users(id),
  resolution  TEXT,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_disputes_booking ON disputes(booking_id);
CREATE INDEX idx_disputes_status  ON disputes(status);

CREATE TRIGGER trg_disputes_updated_at
  BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- INVITATIONS & LANDLORD-PROVIDER RELATIONSHIPS
-- ============================================================================

CREATE TABLE invitations (
  id                    UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_id           UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id           UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id           UUID              REFERENCES properties(id),
  message               TEXT,
  custom_commission_rate DECIMAL(5,2),
  status                invitation_status NOT NULL DEFAULT 'pending',
  accepted_at           TIMESTAMPTZ,
  expires_at            TIMESTAMPTZ       DEFAULT (NOW() + INTERVAL '30 days'),
  created_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invitations_landlord ON invitations(landlord_id);
CREATE INDEX idx_invitations_provider ON invitations(provider_id);
CREATE INDEX idx_invitations_status   ON invitations(status);

-- ----------------------------------------------------------------------------

CREATE TABLE landlord_provider_relationships (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- invited | organic
  relationship_type     TEXT        NOT NULL DEFAULT 'invited',
  custom_commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.0,
  is_active             BOOLEAN     NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(landlord_id, provider_id)
);

CREATE INDEX idx_lp_landlord  ON landlord_provider_relationships(landlord_id);
CREATE INDEX idx_lp_provider  ON landlord_provider_relationships(provider_id);


-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE notifications (
  id         UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      TEXT              NOT NULL,
  body       TEXT              NOT NULL,
  data       JSONB,
  is_read    BOOLEAN           NOT NULL DEFAULT false,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user   ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;


-- ============================================================================
-- DOCUMENTS
-- ============================================================================

CREATE TABLE documents (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        document_type NOT NULL,
  title       TEXT          NOT NULL,
  file_url    TEXT          NOT NULL,
  file_name   TEXT          NOT NULL,
  file_size   INTEGER,
  mime_type   TEXT,
  is_verified BOOLEAN       NOT NULL DEFAULT false,
  verified_by UUID          REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  expires_at  DATE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_user ON documents(user_id);


-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE users                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE landlord_profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_compliance           ENABLE ROW LEVEL SECURITY;
ALTER TABLE services                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_services             ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots            ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_milestones            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants     ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE landlord_provider_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents                     ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND 'admin' = ANY(roles)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ---- USERS ----
CREATE POLICY "users: own or admin"
  ON users FOR ALL
  USING (id = auth.uid() OR is_admin());

-- ---- CUSTOMER PROFILES ----
CREATE POLICY "customer_profiles: own or admin"
  ON customer_profiles FOR ALL
  USING (user_id = auth.uid() OR is_admin());

-- ---- PROVIDER PROFILES: public read ----
CREATE POLICY "provider_profiles: public read"
  ON provider_profiles FOR SELECT
  USING (true);
CREATE POLICY "provider_profiles: own write"
  ON provider_profiles FOR ALL
  USING (user_id = auth.uid() OR is_admin());

-- ---- LANDLORD PROFILES ----
CREATE POLICY "landlord_profiles: own or admin"
  ON landlord_profiles FOR ALL
  USING (user_id = auth.uid() OR is_admin());

-- ---- TENANT PROFILES ----
CREATE POLICY "tenant_profiles: own or admin"
  ON tenant_profiles FOR ALL
  USING (user_id = auth.uid() OR is_admin());

-- ---- PROPERTIES ----
CREATE POLICY "properties: landlord manages"
  ON properties FOR ALL
  USING (landlord_id = auth.uid() OR is_admin());
CREATE POLICY "properties: tenant can view their property"
  ON properties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.property_id = properties.id AND t.user_id = auth.uid()
    )
  );

-- ---- TENANTS ----
CREATE POLICY "tenants: landlord manages"
  ON tenants FOR ALL
  USING (landlord_id = auth.uid() OR is_admin());
CREATE POLICY "tenants: user views own record"
  ON tenants FOR SELECT
  USING (user_id = auth.uid());

-- ---- PROPERTY COMPLIANCE ----
CREATE POLICY "property_compliance: landlord manages"
  ON property_compliance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_compliance.property_id AND p.landlord_id = auth.uid()
    )
    OR is_admin()
  );

-- ---- SERVICES: public read ----
CREATE POLICY "services: public read"
  ON services FOR SELECT
  USING (true);
CREATE POLICY "services: admin write"
  ON services FOR ALL
  USING (is_admin());

-- ---- PROVIDER SERVICES ----
CREATE POLICY "provider_services: public read"
  ON provider_services FOR SELECT
  USING (true);
CREATE POLICY "provider_services: own write"
  ON provider_services FOR ALL
  USING (provider_id = auth.uid() OR is_admin());

-- ---- AVAILABILITY: public read ----
CREATE POLICY "availability_slots: public read"
  ON availability_slots FOR SELECT
  USING (true);
CREATE POLICY "availability_slots: own write"
  ON availability_slots FOR ALL
  USING (provider_id = auth.uid() OR is_admin());

-- ---- BOOKINGS ----
CREATE POLICY "bookings: parties can view"
  ON bookings FOR SELECT
  USING (
    customer_id = auth.uid() OR
    provider_id = auth.uid() OR
    landlord_id = auth.uid() OR
    tenant_id   = auth.uid() OR
    payer_id    = auth.uid() OR
    is_admin()
  );
CREATE POLICY "bookings: authenticated can create"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "bookings: parties can update"
  ON bookings FOR UPDATE
  USING (
    customer_id = auth.uid() OR
    provider_id = auth.uid() OR
    landlord_id = auth.uid() OR
    is_admin()
  );

-- ---- BOOKING MILESTONES ----
CREATE POLICY "booking_milestones: booking parties can view"
  ON booking_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_milestones.booking_id AND (
        b.customer_id = auth.uid() OR
        b.provider_id = auth.uid() OR
        b.landlord_id = auth.uid()
      )
    )
    OR is_admin()
  );

-- ---- PAYMENTS ----
CREATE POLICY "payments: payer or admin"
  ON payments FOR SELECT
  USING (payer_id = auth.uid() OR is_admin());

-- ---- MAINTENANCE ----
CREATE POLICY "maintenance_requests: landlord manages"
  ON maintenance_requests FOR ALL
  USING (landlord_id = auth.uid() OR is_admin());
CREATE POLICY "maintenance_requests: tenant views own"
  ON maintenance_requests FOR SELECT
  USING (tenant_id = auth.uid());
CREATE POLICY "maintenance_requests: tenant can create"
  ON maintenance_requests FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ---- CONVERSATIONS ----
CREATE POLICY "conversations: participants can view"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id AND cp.user_id = auth.uid()
    )
    OR is_admin()
  );
CREATE POLICY "conversations: authenticated can create"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ---- CONVERSATION PARTICIPANTS ----
CREATE POLICY "conversation_participants: own or co-participant"
  ON conversation_participants FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

-- ---- MESSAGES ----
CREATE POLICY "messages: participants can view"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
    )
    OR is_admin()
  );
CREATE POLICY "messages: participants can send"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
    )
  );

-- ---- REVIEWS: public read ----
CREATE POLICY "reviews: public read"
  ON reviews FOR SELECT
  USING (true);
CREATE POLICY "reviews: reviewer can write"
  ON reviews FOR ALL
  USING (reviewer_id = auth.uid() OR is_admin());

-- ---- DISPUTES ----
CREATE POLICY "disputes: parties or admin"
  ON disputes FOR SELECT
  USING (raised_by = auth.uid() OR is_admin());
CREATE POLICY "disputes: authenticated can raise"
  ON disputes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "disputes: admin resolves"
  ON disputes FOR UPDATE
  USING (is_admin());

-- ---- INVITATIONS ----
CREATE POLICY "invitations: landlord or provider can view"
  ON invitations FOR SELECT
  USING (landlord_id = auth.uid() OR provider_id = auth.uid() OR is_admin());
CREATE POLICY "invitations: landlord can create/delete"
  ON invitations FOR ALL
  USING (landlord_id = auth.uid() OR is_admin());
CREATE POLICY "invitations: provider can accept/decline"
  ON invitations FOR UPDATE
  USING (provider_id = auth.uid() OR is_admin());

-- ---- RELATIONSHIPS ----
CREATE POLICY "lp_relationships: involved parties"
  ON landlord_provider_relationships FOR SELECT
  USING (landlord_id = auth.uid() OR provider_id = auth.uid() OR is_admin());

-- ---- NOTIFICATIONS ----
CREATE POLICY "notifications: own only"
  ON notifications FOR ALL
  USING (user_id = auth.uid() OR is_admin());

-- ---- DOCUMENTS ----
CREATE POLICY "documents: own or admin"
  ON documents FOR ALL
  USING (user_id = auth.uid() OR is_admin());


-- ============================================================================
-- SEED: Service categories
-- ============================================================================

INSERT INTO services (title, category) VALUES
  ('Plumbing Repair',       'plumbing'),
  ('Pipe Installation',     'plumbing'),
  ('Electrical Repair',     'electrical'),
  ('Electrical Installation','electrical'),
  ('AC Service & Repair',   'hvac'),
  ('AC Installation',       'hvac'),
  ('Painting (Interior)',   'painting'),
  ('Painting (Exterior)',   'painting'),
  ('General Carpentry',     'carpentry'),
  ('Tile Installation',     'tiling'),
  ('Roof Repair',           'roofing'),
  ('Landscaping',           'landscaping'),
  ('Pool Service',          'pool'),
  ('Pest Control',          'pest_control'),
  ('House Cleaning',        'cleaning'),
  ('Deep Cleaning',         'cleaning'),
  ('Appliance Repair',      'appliances'),
  ('Locksmith',             'security'),
  ('Window & Door Repair',  'windows_doors'),
  ('Handyman Services',     'handyman')
ON CONFLICT (title) DO NOTHING;
