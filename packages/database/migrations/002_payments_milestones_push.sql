-- ============================================================================
-- MIGRATION 002 — Stripe Connect, Booking Milestones, Push Tokens
-- Run in Supabase SQL Editor after 001_quotes_and_auto_approve.sql
-- ============================================================================


-- ============================================================================
-- STRIPE CONNECT — Add Connect account info to provider profiles
-- ============================================================================

ALTER TABLE provider_profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id       TEXT,
  ADD COLUMN IF NOT EXISTS stripe_account_status   TEXT DEFAULT 'not_connected';
  -- stripe_account_status values: not_connected | pending | active | restricted

CREATE INDEX IF NOT EXISTS idx_provider_stripe_account ON provider_profiles(stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;


-- ============================================================================
-- PAYMENTS — Add escrow/capture fields
-- ============================================================================

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS stripe_charge_id        TEXT,
  ADD COLUMN IF NOT EXISTS captured_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS capture_method          TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS transfer_id             TEXT,
  ADD COLUMN IF NOT EXISTS refund_id               TEXT;
  -- capture_method: manual (escrow) | automatic (immediate)
  -- transfer_id: Stripe Transfer ID when funds released to provider


-- ============================================================================
-- BOOKING MILESTONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS booking_milestones (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id         UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  title              TEXT        NOT NULL,
  description        TEXT,
  amount_cents       BIGINT      NOT NULL CHECK (amount_cents > 0),
  due_date           DATE,
  status             TEXT        NOT NULL DEFAULT 'pending',
  stripe_transfer_id TEXT,
  released_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_booking ON booking_milestones(booking_id);

DROP TRIGGER IF EXISTS trg_milestones_updated_at ON booking_milestones;
CREATE TRIGGER trg_milestones_updated_at
  BEFORE UPDATE ON booking_milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE booking_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_milestones_access"
  ON booking_milestones FOR ALL
  USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE customer_id = auth.uid()
         OR provider_id = auth.uid()
         OR landlord_id = auth.uid()
         OR payer_id    = auth.uid()
    )
  );


-- ============================================================================
-- PUSH TOKENS
-- ============================================================================

CREATE TABLE IF NOT EXISTS push_tokens (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT        NOT NULL,
  platform   TEXT        NOT NULL DEFAULT 'expo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_tokens_own"
  ON push_tokens FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "push_tokens_service"
  ON push_tokens FOR INSERT
  WITH CHECK (true);
