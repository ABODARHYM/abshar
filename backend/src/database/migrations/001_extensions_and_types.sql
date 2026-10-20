-- 001: Extensions, shared functions, enum types
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- جداول append-only (سجل مالي، تدقيق، تاريخ الحالات): ممنوع UPDATE/DELETE
CREATE OR REPLACE FUNCTION prevent_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% on table % is not allowed: table is append-only', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TYPE user_status AS ENUM ('pending', 'active', 'suspended', 'deleted');
CREATE TYPE store_status AS ENUM ('pending', 'active', 'suspended', 'closed');
CREATE TYPE store_staff_role AS ENUM ('owner', 'manager', 'staff');
CREATE TYPE driver_status AS ENUM ('pending', 'active', 'suspended');
CREATE TYPE driver_availability AS ENUM ('offline', 'online', 'busy');

CREATE TYPE order_status AS ENUM (
  'pending',
  'accepted',
  'rejected',
  'preparing',
  'ready',
  'driverAssigned',
  'driverGoingToStore',
  'driverArrivedStore',
  'pickedUp',
  'driverGoingToCustomer',
  'driverArrivedCustomer',
  'delivered',
  'cancelled'
);

CREATE TYPE payment_method AS ENUM ('cash_on_delivery', 'card', 'wallet');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'cancelled');

CREATE TYPE discount_type AS ENUM ('percentage', 'fixed', 'free_delivery');

CREATE TYPE assignment_status AS ENUM ('offered', 'accepted', 'rejected', 'expired', 'cancelled', 'completed');
CREATE TYPE assignment_mode AS ENUM ('manual', 'auto');

CREATE TYPE notification_type AS ENUM (
  'ORDER_CREATED', 'ORDER_ACCEPTED', 'ORDER_REJECTED', 'ORDER_PREPARING', 'ORDER_READY',
  'DRIVER_ASSIGNED', 'DRIVER_PICKED_UP', 'DRIVER_ARRIVED', 'ORDER_DELIVERED',
  'PROMOTION', 'SYSTEM', 'SUPPORT'
);
CREATE TYPE device_platform AS ENUM ('android', 'ios', 'web');

CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE TYPE ledger_account_type AS ENUM ('platform', 'store', 'driver', 'customer');
CREATE TYPE ledger_direction AS ENUM ('debit', 'credit');
CREATE TYPE transaction_type AS ENUM (
  'order_amount', 'delivery_fee', 'discount', 'commission',
  'store_earning', 'driver_earning', 'cod_collection',
  'settlement_payout', 'refund', 'adjustment'
);
CREATE TYPE settlement_status AS ENUM ('pending', 'approved', 'paid', 'cancelled');
