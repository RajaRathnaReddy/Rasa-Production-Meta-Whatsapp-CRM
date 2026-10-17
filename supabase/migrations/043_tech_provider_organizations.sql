-- ============================================================
-- 043_tech_provider_organizations.sql
--
-- Enables Meta Tech Provider multi-tenant organization enrollment,
-- service pause/resume controls, and billing verification status.
-- ============================================================

-- 1. Relax single-account-per-owner constraint so Tech Provider owner can manage multiple organizations
DROP INDEX IF EXISTS idx_accounts_one_per_owner;

-- 2. Add Tech Provider management columns to accounts
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS service_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS billing_status TEXT NOT NULL DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS waba_id TEXT,
  ADD COLUMN IF NOT EXISTS phone_number_id TEXT;

-- 3. Add constraint checks
ALTER TABLE accounts
  DROP CONSTRAINT IF EXISTS accounts_service_status_check;
ALTER TABLE accounts
  ADD CONSTRAINT accounts_service_status_check
  CHECK (service_status IN ('active', 'paused', 'suspended'));

ALTER TABLE accounts
  DROP CONSTRAINT IF EXISTS accounts_billing_status_check;
ALTER TABLE accounts
  ADD CONSTRAINT accounts_billing_status_check
  CHECK (billing_status IN ('paid', 'unpaid', 'trial', 'overdue'));

-- 4. Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_accounts_service_status
  ON accounts(service_status);

CREATE INDEX IF NOT EXISTS idx_accounts_billing_status
  ON accounts(billing_status);
