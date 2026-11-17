-- Separate driver cash remittance from settlement payout.
-- This migration only adds the enum value; application code may use it after commit.
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'cash_remittance';
