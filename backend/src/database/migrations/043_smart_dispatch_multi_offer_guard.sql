-- 043: Allow concurrent Smart Dispatch offers while keeping a single accepted driver per order.
-- The old partial unique index treated every 'offered' row as a final assignment,
-- which prevented the service from offering the same order to multiple eligible drivers.

DROP INDEX IF EXISTS driver_assignments_one_active_per_order;

CREATE UNIQUE INDEX IF NOT EXISTS driver_assignments_one_accepted_per_order
  ON driver_assignments (order_id)
  WHERE status = 'accepted';

CREATE UNIQUE INDEX IF NOT EXISTS driver_assignments_one_offer_per_driver_per_order
  ON driver_assignments (order_id, driver_id)
  WHERE status = 'offered';
