-- 009: banners, promotions, settings, audit logs

CREATE TABLE banners (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      varchar(160) NOT NULL,
  image_url  text NOT NULL,
  link_type  varchar(20) CHECK (link_type IN ('store', 'product', 'category', 'url')),
  link_value varchar(500),
  zone_id    uuid REFERENCES delivery_zones(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  starts_at  timestamptz,
  ends_at    timestamptz,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT banners_period_valid CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at)
);
CREATE TRIGGER banners_set_updated_at BEFORE UPDATE ON banners
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE promotions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       uuid REFERENCES stores(id) ON DELETE CASCADE, -- NULL = عرض على مستوى المنصة
  title_ar       varchar(160) NOT NULL,
  title_en       varchar(160) NOT NULL,
  description_ar text,
  description_en text,
  discount_type  discount_type NOT NULL,
  discount_value numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  image_url      text,
  starts_at      timestamptz NOT NULL,
  ends_at        timestamptz NOT NULL,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promotions_period_valid CHECK (ends_at > starts_at),
  CONSTRAINT promotions_percentage_range CHECK (discount_type <> 'percentage' OR discount_value BETWEEN 0 AND 100)
);
CREATE TRIGGER promotions_set_updated_at BEFORE UPDATE ON promotions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE settings (
  key         varchar(100) PRIMARY KEY,
  value       jsonb NOT NULL,
  description text,
  updated_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER settings_set_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- audit_logs: append-only. actor_user_id بدون FK عمدًا ليبقى السجل حتى لو حُذف المستخدم.
CREATE TABLE audit_logs (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id uuid,
  actor_role    varchar(40),
  action        varchar(100) NOT NULL,
  entity_type   varchar(60) NOT NULL,
  entity_id     varchar(64),
  old_value     jsonb,
  new_value     jsonb,
  ip_address    varchar(45),
  user_agent    text,
  device_info   text,
  request_id    varchar(64),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER audit_logs_append_only BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
