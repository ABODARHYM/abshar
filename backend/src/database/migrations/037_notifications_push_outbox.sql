-- Add every notification type already emitted by the application but missing from the original enum.
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ORDER_CANCELLED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ORDER_STATUS_CHANGED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'EARNINGS_ADDED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'LOYALTY_EARNED';
-- 037: Durable Web Push outbox
-- Notification creation and push delivery scheduling commit atomically.

CREATE TABLE IF NOT EXISTS notification_push_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL UNIQUE REFERENCES notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  delivered_endpoints text[] NOT NULL DEFAULT '{}',
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notification_push_outbox
  ADD COLUMN IF NOT EXISTS delivered_endpoints text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS notification_push_outbox_pending_idx
  ON notification_push_outbox (next_attempt_at, created_at)
  WHERE status IN ('pending', 'processing');
