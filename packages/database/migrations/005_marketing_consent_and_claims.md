# Migration 005 — Marketing Consent & Workmanship Claims

## booking_photos — add marketing_consent

```sql
ALTER TABLE booking_photos
  ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consent_given_at   TIMESTAMPTZ;

-- Index for admin content queue
CREATE INDEX IF NOT EXISTS idx_booking_photos_marketing_consent
  ON booking_photos (marketing_consent, created_at DESC)
  WHERE marketing_consent = TRUE;
```

## workmanship_claims — new table

```sql
CREATE TABLE IF NOT EXISTS workmanship_claims (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  claimant_id     UUID NOT NULL REFERENCES auth.users(id),
  description     TEXT NOT NULL,
  evidence_urls   TEXT[]  DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','under_review','resolved','rejected')),
  resolution_notes TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id, claimant_id)
);

ALTER TABLE workmanship_claims ENABLE ROW LEVEL SECURITY;

-- Claimant can create and read their own claims
CREATE POLICY "claimant_rw" ON workmanship_claims
  FOR ALL USING (claimant_id = auth.uid());

-- Admins can read/update all claims (set role = 'admin' in JWT metadata)
CREATE POLICY "admin_all" ON workmanship_claims
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
```
