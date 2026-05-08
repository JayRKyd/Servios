# Migration 004 — Provider Onboarding: Trade Templates + Onboarding State

Run these statements in your Supabase SQL editor.

---

## 1. Add onboarding fields to provider_profiles

```sql
ALTER TABLE provider_profiles
  ADD COLUMN IF NOT EXISTS trade_category      TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step     TEXT DEFAULT 'trade';
  -- onboarding_step values: 'trade' | 'services' | 'documents' | 'complete'
```

---

## 2. trade_service_templates

Pre-built service catalogue per trade category. Used to populate the
"tick what you offer" screen during provider onboarding.

```sql
CREATE TABLE trade_service_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade        TEXT NOT NULL,   -- matches trade_category on provider_profiles
  name         TEXT NOT NULL,
  description  TEXT,
  price_min    NUMERIC(10,2),   -- typical low-end price in USD
  price_max    NUMERIC(10,2),   -- typical high-end price in USD
  price_type   TEXT NOT NULL DEFAULT 'fixed'
               CHECK (price_type IN ('fixed','hourly','quote')),
  sort_order   INT  NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX trade_service_templates_trade_idx ON trade_service_templates(trade);

-- Public read (providers need this during onboarding — no auth)
ALTER TABLE trade_service_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read trade templates"
  ON trade_service_templates FOR SELECT USING (true);
```

### Seed data

```sql
INSERT INTO trade_service_templates (trade, name, description, price_min, price_max, price_type, sort_order) VALUES

-- Plumber
('plumber', 'General Plumbing',            'General plumbing repairs and maintenance',    75,  150, 'hourly',  1),
('plumber', 'Leak Repair',                 'Detect and fix leaks in pipes or fixtures',   80,  200, 'fixed',   2),
('plumber', 'Pipe Installation',           'Install new water or drain pipes',           150,  500, 'fixed',   3),
('plumber', 'Water Heater Install/Repair', 'Install or service water heaters',           200,  600, 'fixed',   4),
('plumber', 'Drain Cleaning',              'Clear blocked or slow drains',                80,  180, 'fixed',   5),
('plumber', 'Bathroom Fixture Install',    'Toilet, sink, shower installation',          100,  350, 'fixed',   6),
('plumber', 'Kitchen Fixture Install',     'Sink, dishwasher, garbage disposal',         100,  300, 'fixed',   7),

-- Electrician
('electrician', 'Electrical Inspection',  'Full electrical system inspection',          150,  300, 'fixed',   1),
('electrician', 'Wiring Installation',    'Install new wiring or rewire rooms',         200,  800, 'fixed',   2),
('electrician', 'Panel Upgrade',          'Upgrade electrical panel/breaker box',       400, 1200, 'fixed',   3),
('electrician', 'Outlet/Switch Install',  'Install or replace outlets and switches',     60,  150, 'fixed',   4),
('electrician', 'Lighting Installation',  'Install ceiling fans, fixtures, LEDs',        80,  250, 'fixed',   5),
('electrician', 'Generator Install',      'Install standby or portable generator',      300, 1500, 'fixed',   6),
('electrician', 'Emergency Electrical',   'Emergency fault diagnosis and repair',       150,  400, 'fixed',   7),

-- AC / HVAC
('ac_hvac', 'AC Installation',            'Install new air conditioning unit',          400, 1200, 'fixed',   1),
('ac_hvac', 'AC Service & Maintenance',   'Clean and service existing AC unit',          80,  200, 'fixed',   2),
('ac_hvac', 'AC Repair',                  'Diagnose and repair AC faults',              100,  400, 'fixed',   3),
('ac_hvac', 'Duct Cleaning',              'Clean air ducts and vents',                  150,  350, 'fixed',   4),
('ac_hvac', 'Thermostat Installation',    'Install or replace thermostat',               60,  150, 'fixed',   5),
('ac_hvac', 'Mini-Split Installation',    'Install ductless mini-split system',         500, 1500, 'fixed',   6),

-- Carpenter
('carpenter', 'Furniture Repair',         'Repair or restore furniture',                 60,  200, 'fixed',   1),
('carpenter', 'Cabinet Installation',     'Install or build kitchen/bathroom cabinets',  200,  800, 'fixed',   2),
('carpenter', 'Door & Window Install',    'Fit or replace doors and windows',           150,  500, 'fixed',   3),
('carpenter', 'Flooring Installation',    'Hardwood, laminate, or tile flooring',       200, 1000, 'fixed',   4),
('carpenter', 'Deck Construction',        'Build or repair outdoor decks',              400, 2000, 'fixed',   5),
('carpenter', 'General Carpentry',        'Custom woodwork and general repairs',         75,  200, 'hourly',  6),

-- Painter
('painter', 'Interior Painting',          'Paint interior rooms and ceilings',          150,  600, 'fixed',   1),
('painter', 'Exterior Painting',          'Paint exterior walls and trim',              300, 1200, 'fixed',   2),
('painter', 'Surface Preparation',        'Sanding, priming, and crack filling',         80,  250, 'fixed',   3),
('painter', 'Wallpaper Install/Remove',   'Hang or strip wallpaper',                    100,  400, 'fixed',   4),
('painter', 'Deck Staining',              'Sand and stain wooden decks',                150,  500, 'fixed',   5),

-- Cleaner
('cleaner', 'Deep Cleaning',              'Thorough top-to-bottom clean',               120,  350, 'fixed',   1),
('cleaner', 'Regular Maintenance Clean',  'Recurring weekly or bi-weekly cleaning',      80,  180, 'fixed',   2),
('cleaner', 'Move-In / Move-Out Clean',   'Full clean for property changeovers',        150,  400, 'fixed',   3),
('cleaner', 'Post-Construction Clean',    'Remove dust and debris after renovation',    200,  600, 'fixed',   4),
('cleaner', 'Commercial Cleaning',        'Office and commercial space cleaning',       150,  500, 'fixed',   5),

-- Landscaper
('landscaper', 'Lawn Maintenance',        'Mow, edge, and tidy lawns',                   60,  150, 'fixed',   1),
('landscaper', 'Tree Trimming',           'Prune and shape trees and hedges',            80,  300, 'fixed',   2),
('landscaper', 'Garden Design',           'Design and plant garden beds',               200,  800, 'fixed',   3),
('landscaper', 'Irrigation Installation', 'Install sprinkler or drip system',           300, 1000, 'fixed',   4),
('landscaper', 'Yard Clean-Up',           'Full yard debris removal and tidy',           80,  250, 'fixed',   5),

-- Mason / Builder
('mason', 'Wall Construction',            'Build or repair block/brick walls',          200, 1000, 'fixed',   1),
('mason', 'Concrete Work',                'Pour slabs, steps, or pathways',             200,  800, 'fixed',   2),
('mason', 'Tile Installation',            'Lay floor or wall tiles',                    150,  600, 'fixed',   3),
('mason', 'Foundation Repair',            'Diagnose and repair foundation issues',      300, 1500, 'fixed',   4),
('mason', 'Rendering & Plastering',       'Apply render or plaster to walls',           150,  500, 'fixed',   5),

-- Roofer
('roofer', 'Roof Inspection',             'Full roof condition inspection',             100,  250, 'fixed',   1),
('roofer', 'Roof Repair',                 'Fix leaks, damaged tiles, or flashing',      150,  600, 'fixed',   2),
('roofer', 'Roof Replacement',            'Full or partial roof replacement',           800, 5000, 'quote',   3),
('roofer', 'Gutter Install/Repair',       'Install or clear and repair gutters',        100,  400, 'fixed',   4),
('roofer', 'Flat Roof Waterproofing',     'Apply waterproofing membrane',               200,  800, 'fixed',   5),

-- Handyman
('handyman', 'General Repairs',           'Miscellaneous household repairs',             60,  150, 'hourly',  1),
('handyman', 'Furniture Assembly',        'Flat-pack and ready-to-assemble furniture',   50,  150, 'fixed',   2),
('handyman', 'TV & Picture Mounting',     'Mount TVs and artwork on walls',              60,  150, 'fixed',   3),
('handyman', 'Door & Lock Repair',        'Fix sticking doors, replace locks',           60,  200, 'fixed',   4),
('handyman', 'Caulking & Sealing',        'Reseal bathrooms, windows, and doors',        60,  180, 'fixed',   5),
('handyman', 'Pressure Washing',          'Clean driveways, patios, and walls',          80,  250, 'fixed',   6);
```

---

## 3. provider_trade_services

Records which templates a provider has selected (and their custom price).
Also stores custom services they added that aren't in the template list.

```sql
CREATE TABLE provider_trade_services (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id   UUID REFERENCES trade_service_templates(id),  -- NULL if custom
  name          TEXT NOT NULL,
  description   TEXT,
  price         NUMERIC(10,2) NOT NULL,
  price_type    TEXT NOT NULL DEFAULT 'fixed'
                CHECK (price_type IN ('fixed','hourly','quote')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, template_id)   -- one entry per template per provider
);

CREATE INDEX provider_trade_services_provider_idx ON provider_trade_services(provider_id);

ALTER TABLE provider_trade_services ENABLE ROW LEVEL SECURITY;

-- Provider manages their own services
CREATE POLICY "Provider manages own trade services"
  ON provider_trade_services FOR ALL
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Anyone can read active services (for provider profiles / search)
CREATE POLICY "Public can read active trade services"
  ON provider_trade_services FOR SELECT
  USING (is_active = true);
```

---

## Notes

- `provider_profiles.trade_category` must match one of the `trade` values in `trade_service_templates` (plumber, electrician, ac_hvac, carpenter, painter, cleaner, landscaper, mason, roofer, handyman).
- `provider_profiles.onboarding_complete = true` is set by the API after the provider submits documents.
- All prices are in **USD (Bahamian Dollars)**.
