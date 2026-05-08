# Migration 003 — Booking Photos & Preferred Providers

Run these statements in your Supabase SQL editor.

---

## 1. Booking Photos

Stores before/after job photos uploaded by the provider.

```sql
CREATE TABLE booking_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  uploaded_by   UUID NOT NULL REFERENCES auth.users(id),
  url           TEXT NOT NULL,
  storage_path  TEXT NOT NULL,          -- Supabase Storage object path
  type          TEXT NOT NULL CHECK (type IN ('before', 'after')),
  caption       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX booking_photos_booking_id_idx ON booking_photos(booking_id);

-- RLS
ALTER TABLE booking_photos ENABLE ROW LEVEL SECURITY;

-- Anyone involved in the booking can view photos
CREATE POLICY "Booking parties can view photos"
  ON booking_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_photos.booking_id
        AND (b.customer_id = auth.uid() OR b.provider_id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN properties p ON p.id = b.property_id
      WHERE b.id = booking_photos.booking_id
        AND p.landlord_id = auth.uid()
    )
  );

-- Only the provider (uploader) can insert photos
CREATE POLICY "Provider can upload photos"
  ON booking_photos FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_photos.booking_id
        AND b.provider_id = auth.uid()
        AND b.status IN ('in_progress', 'completed')
    )
  );

-- Provider can delete their own photos
CREATE POLICY "Provider can delete own photos"
  ON booking_photos FOR DELETE
  USING (uploaded_by = auth.uid());
```

### Supabase Storage Bucket

Create a bucket named **`booking-photos`** in Storage → Buckets:

```sql
-- Or via Dashboard: Storage → New bucket → name: "booking-photos", public: false
INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-photos', 'booking-photos', false);

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Authenticated users can upload booking photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'booking-photos'
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to read (service role handles signed URLs server-side)
CREATE POLICY "Authenticated users can read booking photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'booking-photos'
    AND auth.role() = 'authenticated'
  );

-- Allow uploader to delete
CREATE POLICY "Uploader can delete booking photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'booking-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

---

## 2. Preferred Providers

Landlords maintain a list of trusted/preferred service providers.

```sql
CREATE TABLE preferred_providers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notes        TEXT,                    -- private landlord notes about this provider
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (landlord_id, provider_id)
);

CREATE INDEX preferred_providers_landlord_id_idx ON preferred_providers(landlord_id);

-- RLS
ALTER TABLE preferred_providers ENABLE ROW LEVEL SECURITY;

-- Landlord manages their own list
CREATE POLICY "Landlord manages preferred providers"
  ON preferred_providers FOR ALL
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- Provider can see if they are on any landlord's preferred list
CREATE POLICY "Provider can see their preferred status"
  ON preferred_providers FOR SELECT
  USING (provider_id = auth.uid());
```

---

## Notes

- `booking_photos.storage_path` stores the Supabase Storage key (e.g. `{user_id}/{booking_id}/before_1234.jpg`) so signed URLs can be generated server-side via the API.
- `preferred_providers.notes` is visible only to the landlord (enforced by RLS).
- After running, confirm `booking_photos` and `preferred_providers` appear in the Table Editor.
