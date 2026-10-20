-- ═══════════════════════════════════════════════════════════
-- Migration 025: Notifications v2 (WebSocket + Push)
-- PHASE 8
-- ═══════════════════════════════════════════════════════════

-- جدول إشعارات محسّن
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS category varchar(30) DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS priority varchar(10) DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS icon varchar(50),
  ADD COLUMN IF NOT EXISTS action_url text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz DEFAULT now();

-- فهارس
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications (user_id, is_read) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS notifications_category_idx
  ON notifications (user_id, category, created_at DESC);

-- قيود
DO $$ BEGIN
  ALTER TABLE notifications
    ADD CONSTRAINT notifications_priority_check
    CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE notifications
    ADD CONSTRAINT notifications_category_check
    CHECK (category IN (
      'general', 'order', 'delivery', 'payment',
      'loyalty', 'referral', 'promo', 'system', 'chat'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- جدول Push Subscriptions (Web Push)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint        text NOT NULL,
  p256dh          text NOT NULL,
  auth            text NOT NULL,
  user_agent      text,
  is_active       boolean NOT NULL DEFAULT true,
  last_used_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_unique UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON push_subscriptions (user_id, is_active);

DROP TRIGGER IF EXISTS push_subscriptions_set_updated_at ON push_subscriptions;
CREATE TRIGGER push_subscriptions_set_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Device tokens (للمستقبل — FCM)
CREATE TABLE IF NOT EXISTS device_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token        text NOT NULL,
  platform     varchar(20) NOT NULL,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT device_tokens_unique UNIQUE (token),
  CONSTRAINT device_tokens_platform_check
    CHECK (platform IN ('web', 'android', 'ios'))
);

-- الجدول أُنشئ في 007 بدون هذين العمودين، لذلك CREATE TABLE IF NOT EXISTS أعلاه لا يضيفهما.
ALTER TABLE device_tokens
  ADD COLUMN IF NOT EXISTS is_active  boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS device_tokens_user_idx
  ON device_tokens (user_id, is_active);

DROP TRIGGER IF EXISTS device_tokens_set_updated_at ON device_tokens;
CREATE TRIGGER device_tokens_set_updated_at
  BEFORE UPDATE ON device_tokens
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
