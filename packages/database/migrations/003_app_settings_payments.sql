-- ── app_settings: stores platform-wide config (commission rates, etc.) ────────
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default commission rates (no-op if already exists)
INSERT INTO app_settings (key, value)
VALUES ('commission_rates', '{"standard": 12, "preferred": 10, "emergency": 15}')
ON CONFLICT (key) DO NOTHING;

-- ── Fix payments table: add columns that the API writes but schema was missing ─
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS capture_method   TEXT        DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS captured_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS transfer_id      TEXT;

-- RLS: only service role can mutate app_settings; anyone authenticated can read
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read app_settings"
  ON app_settings FOR SELECT USING (true);

CREATE POLICY "Service role write app_settings"
  ON app_settings FOR ALL USING (auth.role() = 'service_role');
