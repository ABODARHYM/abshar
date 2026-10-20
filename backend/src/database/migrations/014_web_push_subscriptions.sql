-- ============================================================
-- ABSHER BI — Web Push Subscriptions
-- ============================================================

CREATE TABLE IF NOT EXISTS web_push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    endpoint TEXT NOT NULL,

    p256dh TEXT NOT NULL,

    auth TEXT NOT NULL,

    user_agent TEXT,

    device_label VARCHAR(120),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    last_used_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_web_push_endpoint UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_user
    ON web_push_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_active
    ON web_push_subscriptions(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_last_used
    ON web_push_subscriptions(last_used_at);
