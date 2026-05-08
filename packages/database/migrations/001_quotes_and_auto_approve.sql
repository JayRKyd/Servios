-- ============================================================================
-- MIGRATION 001 — Quote Requests + Auto-Approval Threshold
-- Run in Supabase SQL Editor after applying schema.sql
-- ============================================================================


-- ============================================================================
-- AUTO-APPROVAL THRESHOLD
-- Add to landlord_profiles so each landlord can configure their own limit.
-- Stored in USD dollars (e.g. 500 = auto-approve jobs ≤ USD 500).
-- ============================================================================

ALTER TABLE landlord_profiles
  ADD COLUMN IF NOT EXISTS auto_approve_threshold DECIMAL(10,2);

-- Trigger function: fires BEFORE INSERT OR UPDATE on bookings.
-- bookings.landlord_id references landlord_profiles(id), so we match on id.
CREATE OR REPLACE FUNCTION auto_approve_booking()
RETURNS TRIGGER AS $$
DECLARE
  threshold_cents BIGINT;
BEGIN
  IF NEW.status = 'pending' AND NEW.landlord_id IS NOT NULL AND NEW.total_amount > 0 THEN
    SELECT FLOOR(auto_approve_threshold * 100)
      INTO threshold_cents
      FROM landlord_profiles
     WHERE id = NEW.landlord_id;

    IF threshold_cents IS NOT NULL AND NEW.total_amount <= threshold_cents THEN
      NEW.status := 'accepted';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_approve_booking ON bookings;

CREATE TRIGGER trg_auto_approve_booking
  BEFORE INSERT OR UPDATE OF total_amount, status ON bookings
  FOR EACH ROW EXECUTE FUNCTION auto_approve_booking();


-- ============================================================================
-- QUOTE REQUESTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS quote_requests (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id    UUID        REFERENCES properties(id) ON DELETE SET NULL,
  service_id     UUID        REFERENCES services(id) ON DELETE SET NULL,
  title          TEXT        NOT NULL,
  description    TEXT,
  service_type   TEXT,
  scheduled_date DATE,
  status         TEXT        NOT NULL DEFAULT 'open',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_requests_landlord ON quote_requests(landlord_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status   ON quote_requests(status);

DROP TRIGGER IF EXISTS trg_quote_requests_updated_at ON quote_requests;
CREATE TRIGGER trg_quote_requests_updated_at
  BEFORE UPDATE ON quote_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- QUOTE REQUEST ↔ PROVIDER (which providers were invited)
-- ============================================================================

CREATE TABLE IF NOT EXISTS quote_request_providers (
  quote_request_id UUID        NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  provider_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (quote_request_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_qrp_provider ON quote_request_providers(provider_id);


-- ============================================================================
-- QUOTE RESPONSES
-- ============================================================================

CREATE TABLE IF NOT EXISTS quote_responses (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_request_id UUID          NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  provider_id      UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount           DECIMAL(10,2) NOT NULL,
  estimated_days   INTEGER,
  estimated_hours  DECIMAL(4,1),
  notes            TEXT,
  status           TEXT          NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (quote_request_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_quote_responses_request  ON quote_responses(quote_request_id);
CREATE INDEX IF NOT EXISTS idx_quote_responses_provider ON quote_responses(provider_id);


-- ============================================================================
-- ROW LEVEL SECURITY
-- NOTE: PostgreSQL does not support CREATE POLICY IF NOT EXISTS.
-- These will error if policies already exist — safe to ignore those errors.
-- ============================================================================

ALTER TABLE quote_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_request_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_responses         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "landlord_own_quote_requests"
  ON quote_requests FOR ALL
  USING (landlord_id = auth.uid());

CREATE POLICY "provider_invited_quote_requests"
  ON quote_requests FOR SELECT
  USING (
    id IN (
      SELECT quote_request_id FROM quote_request_providers WHERE provider_id = auth.uid()
    )
  );

CREATE POLICY "landlord_quote_request_providers"
  ON quote_request_providers FOR ALL
  USING (
    quote_request_id IN (
      SELECT id FROM quote_requests WHERE landlord_id = auth.uid()
    )
  );

CREATE POLICY "provider_own_invites"
  ON quote_request_providers FOR SELECT
  USING (provider_id = auth.uid());

CREATE POLICY "provider_own_responses"
  ON quote_responses FOR ALL
  USING (provider_id = auth.uid());

CREATE POLICY "landlord_sees_responses"
  ON quote_responses FOR SELECT
  USING (
    quote_request_id IN (
      SELECT id FROM quote_requests WHERE landlord_id = auth.uid()
    )
  );

CREATE POLICY "landlord_updates_responses"
  ON quote_responses FOR UPDATE
  USING (
    quote_request_id IN (
      SELECT id FROM quote_requests WHERE landlord_id = auth.uid()
    )
  );
