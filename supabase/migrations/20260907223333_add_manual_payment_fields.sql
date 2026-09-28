/*
# Add Manual Payment Fields

1. Overview
   - Adds columns to `payments` table for tracking in-person (POS/cash) payments.
   - Supports POS terminal data (terminal, batch, card last4, approval ref) and cash details.
   - Adds `payment_method` column to distinguish online reports from manual registrations.

2. Modified Tables
   - `payments`: Added columns:
     - `payment_method` (text, default 'online') — 'online', 'pos', or 'cash'
     - `terminal_id` (text, nullable) — POS terminal identifier
     - `batch_number` (text, nullable) — POS batch/lot number
     - `card_last4` (text, nullable) — last 4 digits of card
     - `card_type` (text, nullable) — type of card/instrument
     - `receipt_number` (text, nullable) — system receipt/correlative number
     - `currency_received` (text, nullable) — 'USD' or 'BS' for cash
     - `operator_name` (text, nullable) — name of the cashier/operator

3. Security
   - No new RLS policies needed — existing policies cover the new columns.

4. Important Notes
   - All new columns are nullable so existing online payment reports are not affected.
   - `payment_method` defaults to 'online' so all existing payments are automatically classified.
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'payment_method') THEN
    ALTER TABLE payments ADD COLUMN payment_method text NOT NULL DEFAULT 'online';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'terminal_id') THEN
    ALTER TABLE payments ADD COLUMN terminal_id text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'batch_number') THEN
    ALTER TABLE payments ADD COLUMN batch_number text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'card_last4') THEN
    ALTER TABLE payments ADD COLUMN card_last4 text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'card_type') THEN
    ALTER TABLE payments ADD COLUMN card_type text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'receipt_number') THEN
    ALTER TABLE payments ADD COLUMN receipt_number text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'currency_received') THEN
    ALTER TABLE payments ADD COLUMN currency_received text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'operator_name') THEN
    ALTER TABLE payments ADD COLUMN operator_name text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method);