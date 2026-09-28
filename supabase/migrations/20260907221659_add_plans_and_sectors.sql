/*
# Add Plans and Sectors Tables

1. Overview
   - Creates `plans` table for managing internet service plans (name, speed, price).
   - Creates `sectors` table for managing geographic zones/sectors where clients are located.
   - Adds `plan_id` and `sector_id` foreign key columns to `clients` table.
   - Seeds default plans and sectors.
   - Updates RLS policies for the new tables.

2. New Tables
   - `plans`: Service plans (name, speed_mbps, price_usd, description, active)
   - `sectors`: Geographic zones (name, description, active)

3. Modified Tables
   - `clients`: Added `plan_id` (nullable FK to plans) and `sector_id` (nullable FK to sectors)

4. Security
   - RLS enabled on both new tables.
   - anon + authenticated can SELECT plans and sectors (needed for client portal lookup).
   - Only authenticated (admin) can INSERT/UPDATE/DELETE plans and sectors.

5. Important Notes
   - `plan_name` and `monthly_amount` columns on `clients` are kept for backward compatibility.
   - When a plan_id is set, the client form will use the plan's price as default monthly_amount.
   - Sectors help organize clients by neighborhood/zone for the WISP's ~500 clients.
*/

-- ============================================================
-- PLANS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  speed_mbps integer NOT NULL DEFAULT 100,
  price_usd numeric(10,2) NOT NULL DEFAULT 25.00,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_plans" ON plans;
CREATE POLICY "anon_select_plans" ON plans FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_plans" ON plans;
CREATE POLICY "auth_insert_plans" ON plans FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_plans" ON plans;
CREATE POLICY "auth_update_plans" ON plans FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_plans" ON plans;
CREATE POLICY "auth_delete_plans" ON plans FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- SECTORS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sectors" ON sectors;
CREATE POLICY "anon_select_sectors" ON sectors FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_sectors" ON sectors;
CREATE POLICY "auth_insert_sectors" ON sectors FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_sectors" ON sectors;
CREATE POLICY "auth_update_sectors" ON sectors FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_sectors" ON sectors;
CREATE POLICY "auth_delete_sectors" ON sectors FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- ADD COLUMNS TO CLIENTS
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'plan_id') THEN
    ALTER TABLE clients ADD COLUMN plan_id uuid REFERENCES plans(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'sector_id') THEN
    ALTER TABLE clients ADD COLUMN sector_id uuid REFERENCES sectors(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clients_plan_id ON clients(plan_id);
CREATE INDEX IF NOT EXISTS idx_clients_sector_id ON clients(sector_id);

-- ============================================================
-- SEED DEFAULT PLANS
-- ============================================================
INSERT INTO plans (name, speed_mbps, price_usd, description, active)
VALUES
  ('Plan Básico 20M', 20, 15.00, 'Velocidad básica para navegación y redes sociales', true),
  ('Plan Fibra 50M', 50, 20.00, 'Velocidad intermedia para streaming HD', true),
  ('Plan Fibra 100M', 100, 25.00, 'Velocidad alta para streaming y trabajo remoto', true),
  ('Plan Fibra 200M', 200, 35.00, 'Velocidad premium para gaming y descargas pesadas', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED DEFAULT SECTORS
-- ============================================================
INSERT INTO sectors (name, description, active)
VALUES
  ('Carora Centro', 'Zona centro de Carora', true),
  ('Carora Norte', 'Zona norte de Carora', true),
  ('Carora Sur', 'Zona sur de Carora', true),
  ('Carora Este', 'Zona este de Carora', true),
  ('Carora Oeste', 'Zona oeste de Carora', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- UPDATE EXISTING CLIENTS: link plan_id based on plan_name match
-- ============================================================
UPDATE clients SET
  plan_id = (SELECT id FROM plans WHERE plans.name = clients.plan_name LIMIT 1)
WHERE plan_id IS NULL;

-- ============================================================
-- UPDATE TRIGGER for plans/sectors updated_at
-- ============================================================
DROP TRIGGER IF EXISTS trigger_plans_updated_at ON plans;
CREATE TRIGGER trigger_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_sectors_updated_at ON sectors;
CREATE TRIGGER trigger_sectors_updated_at
  BEFORE UPDATE ON sectors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();