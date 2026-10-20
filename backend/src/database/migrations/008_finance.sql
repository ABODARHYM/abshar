-- 008: payments, ledger transactions, commissions, settlements

CREATE TABLE payments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  method       payment_method NOT NULL,
  status       payment_status NOT NULL DEFAULT 'pending',
  amount       numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency     char(3) NOT NULL,
  provider     varchar(40),          -- PRO: اسم بوابة الدفع
  provider_ref varchar(120),
  collected_by uuid REFERENCES users(id) ON DELETE SET NULL, -- COD: المندوب الذي استلم المبلغ
  paid_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER payments_set_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE settlements (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_type        ledger_account_type NOT NULL CHECK (party_type IN ('store', 'driver')),
  party_id          uuid NOT NULL,
  period_start      date NOT NULL,
  period_end        date NOT NULL,
  gross_amount      numeric(14,2) NOT NULL CHECK (gross_amount >= 0),
  commission_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (commission_amount >= 0),
  net_amount        numeric(14,2) NOT NULL CHECK (net_amount >= 0),
  status            settlement_status NOT NULL DEFAULT 'pending',
  notes             text,
  created_by        uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_by       uuid REFERENCES users(id) ON DELETE SET NULL,
  settled_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT settlements_period_valid CHECK (period_end >= period_start)
);
CREATE TRIGGER settlements_set_updated_at BEFORE UPDATE ON settlements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Ledger: كل حركة مالية سجل جديد، لا تعديل ولا حذف أبدًا. التصحيح يتم بقيد عكسي.
CREATE TABLE transactions (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id     uuid REFERENCES orders(id) ON DELETE RESTRICT,
  settlement_id uuid REFERENCES settlements(id) ON DELETE RESTRICT,
  account_type ledger_account_type NOT NULL,
  account_id   uuid,                   -- NULL لحساب المنصة
  type         transaction_type NOT NULL,
  direction    ledger_direction NOT NULL,
  amount       numeric(14,2) NOT NULL CHECK (amount > 0),
  currency     char(3) NOT NULL,
  description  text,
  created_by   uuid REFERENCES users(id) ON DELETE RESTRICT,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transactions_account_id_required
    CHECK (account_type = 'platform' OR account_id IS NOT NULL)
);
CREATE TRIGGER transactions_append_only BEFORE UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();

CREATE TABLE commissions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  store_id          uuid NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  rate_percent      numeric(5,2) NOT NULL CHECK (rate_percent BETWEEN 0 AND 100),
  order_amount      numeric(14,2) NOT NULL CHECK (order_amount >= 0),
  delivery_fee      numeric(14,2) NOT NULL CHECK (delivery_fee >= 0),
  discount_amount   numeric(14,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  commission_amount numeric(14,2) NOT NULL CHECK (commission_amount >= 0),
  store_amount      numeric(14,2) NOT NULL CHECK (store_amount >= 0),
  driver_amount     numeric(14,2) NOT NULL CHECK (driver_amount >= 0),
  platform_amount   numeric(14,2) NOT NULL CHECK (platform_amount >= 0),
  created_at        timestamptz NOT NULL DEFAULT now()
);
