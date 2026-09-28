/*
# WISP Payment Validation Schema

1. Overview
   - Creates the complete schema for a WISP (Internet Service Provider) payment validation system.
   - Clients look up their account by cédula (national ID), see their balance, and submit payment reports with receipt images.
   - Admins sign in to review submitted payments, approve/reject them, manage clients, and configure settings.

2. New Tables
   - `clients`: WISP subscribers (name, cédula, plan, monthly amount, status, due day)
   - `payments`: Payment reports submitted by clients (amount, reference, receipt image, status)
   - `settings`: Global app config (BCV rate, bank info, company info) — single-row table
   - `payment_audit`: Audit trail of admin actions on payments (approve/reject with notes)

3. Security
   - RLS enabled on all tables.
   - `clients`: anon can SELECT (needed for cédula lookup) and can INSERT payments referencing them. No anon INSERT/UPDATE/DELETE on clients — admin-only via authenticated policies.
   - `payments`: anon can SELECT (to show client their own payment history) and INSERT (submit new payment report). Only authenticated (admin) can UPDATE (approve/reject) and DELETE.
   - `settings`: anon can SELECT (to display bank info, BCV rate). Only authenticated (admin) can UPDATE.
   - `payment_audit`: only authenticated (admin) can SELECT. Inserts are allowed for anon (the system logs the initial submission) — but we'll restrict INSERT to authenticated since the audit is for admin actions. Actually, we'll allow anon INSERT for the "submitted" event and authenticated SELECT.

4. Storage
   - Creates a public storage bucket `receipts` for payment receipt images.

5. Important Notes
   - This is a hybrid app: the client portal has NO login (uses anon key), the admin panel requires sign-in (uses authenticated session).
   - The `settings` table has a single row enforced by a constraint.
   - Cédula is stored as plain digits (e.g., "12345678") and displayed formatted (e.g., "12.345.678").
*/

-- ============================================================
-- CLIENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cedula text UNIQUE NOT NULL,
  full_name text NOT NULL,
  plan_name text NOT NULL DEFAULT 'Plan Básico',
  monthly_amount numeric(10,2) NOT NULL DEFAULT 25.00,
  status text NOT NULL DEFAULT 'activo',
  due_day integer NOT NULL DEFAULT 5,
  phone text,
  address text,
  notes text,
  balance numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Clients: anon can SELECT (for cédula lookup), authenticated can SELECT too
DROP POLICY IF EXISTS "anon_select_clients" ON clients;
CREATE POLICY "anon_select_clients" ON clients FOR SELECT
  TO anon, authenticated USING (true);

-- Only authenticated (admin) can INSERT/UPDATE/DELETE clients
DROP POLICY IF EXISTS "auth_insert_clients" ON clients;
CREATE POLICY "auth_insert_clients" ON clients FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_clients" ON clients;
CREATE POLICY "auth_update_clients" ON clients FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_clients" ON clients;
CREATE POLICY "auth_delete_clients" ON clients FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount_usd numeric(10,2) NOT NULL,
  amount_bs numeric(10,2) NOT NULL,
  reference_number text,
  receipt_url text,
  bcv_rate numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pendiente',
  admin_notes text,
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Payments: anon can SELECT (client sees their own payment history) and INSERT (submit payment)
DROP POLICY IF EXISTS "anon_select_payments" ON payments;
CREATE POLICY "anon_select_payments" ON payments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_payments" ON payments;
CREATE POLICY "anon_insert_payments" ON payments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Only authenticated (admin) can UPDATE (approve/reject) and DELETE
DROP POLICY IF EXISTS "auth_update_payments" ON payments;
CREATE POLICY "auth_update_payments" ON payments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_payments" ON payments;
CREATE POLICY "auth_delete_payments" ON payments FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- SETTINGS TABLE (single row)
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id integer PRIMARY KEY DEFAULT 1,
  bcv_rate numeric(10,2) NOT NULL DEFAULT 36.42,
  bank_name text NOT NULL DEFAULT 'Banesco',
  bank_code text NOT NULL DEFAULT '0134',
  bank_rif text NOT NULL DEFAULT 'J-501234567',
  bank_phone text NOT NULL DEFAULT '0414-1234567',
  company_name text NOT NULL DEFAULT 'RTST Carora',
  company_location text NOT NULL DEFAULT 'Carora, Edo. Lara',
  due_day integer NOT NULL DEFAULT 5,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Settings: anon can SELECT (display bank info, BCV rate)
DROP POLICY IF EXISTS "anon_select_settings" ON settings;
CREATE POLICY "anon_select_settings" ON settings FOR SELECT
  TO anon, authenticated USING (true);

-- Only authenticated (admin) can UPDATE settings
DROP POLICY IF EXISTS "auth_update_settings" ON settings;
CREATE POLICY "auth_update_settings" ON settings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- PAYMENT AUDIT TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  action text NOT NULL,
  notes text,
  performed_by uuid REFERENCES auth.users(id),
  performed_at timestamptz DEFAULT now()
);

ALTER TABLE payment_audit ENABLE ROW LEVEL SECURITY;

-- Audit: only authenticated (admin) can SELECT
DROP POLICY IF EXISTS "auth_select_audit" ON payment_audit;
CREATE POLICY "auth_select_audit" ON payment_audit FOR SELECT
  TO authenticated USING (true);

-- Only authenticated (admin) can INSERT audit records
DROP POLICY IF EXISTS "auth_insert_audit" ON payment_audit;
CREATE POLICY "auth_insert_audit" ON payment_audit FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clients_cedula ON clients(cedula);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_submitted_at ON payments(submitted_at DESC);

-- ============================================================
-- TRIGGER: update updated_at on clients
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_clients_updated_at ON clients;
CREATE TRIGGER trigger_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_settings_updated_at ON settings;
CREATE TRIGGER trigger_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- STORAGE BUCKET for receipts
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: anyone can upload receipts, anyone can read (public bucket)
DROP POLICY IF EXISTS "anon_upload_receipts" ON storage.objects;
CREATE POLICY "anon_upload_receipts" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'receipts');

DROP POLICY IF EXISTS "anon_read_receipts" ON storage.objects;
CREATE POLICY "anon_read_receipts" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'receipts');

DROP POLICY IF EXISTS "auth_delete_receipts" ON storage.objects;
CREATE POLICY "auth_delete_receipts" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'receipts');