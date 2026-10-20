-- ═══════════════════════════════════════════════════════════
-- Migration 024: Referrals
-- PHASE 7ب — Referral System
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS referrals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code            varchar(16) NOT NULL,
  status          varchar(20) NOT NULL DEFAULT 'pending',
  reward_points   integer NOT NULL DEFAULT 0,
  completed_at    timestamptz,
  rewarded_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referrals_unique_referred UNIQUE (referred_id),
  CONSTRAINT referrals_no_self CHECK (referrer_id <> referred_id),
  CONSTRAINT referrals_status_check CHECK (
    status IN ('pending','completed','rewarded','expired','cancelled')
  )
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx
  ON referrals (referrer_id, status);

CREATE INDEX IF NOT EXISTS referrals_code_idx
  ON referrals (code);

DROP TRIGGER IF EXISTS referrals_set_updated_at ON referrals;
CREATE TRIGGER referrals_set_updated_at
  BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ضمان وجود referral_code لكل عميل حالي
UPDATE customers
SET referral_code = UPPER(SUBSTRING(MD5(RANDOM()::text || user_id::text) FROM 1 FOR 8))
WHERE referral_code IS NULL;

-- فهرس على referral_code (موجود كـ UNIQUE)
CREATE INDEX IF NOT EXISTS customers_referral_code_idx
  ON customers (referral_code) WHERE referral_code IS NOT NULL;
