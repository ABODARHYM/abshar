-- 005: coupons, orders, order items, status history, coupon usage

CREATE TABLE coupons (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                citext NOT NULL UNIQUE,
  type                discount_type NOT NULL,
  -- percentage: 0-100 | fixed: مبلغ | free_delivery: يُتجاهل
  value               numeric(12,2) NOT NULL DEFAULT 0 CHECK (value >= 0),
  min_order_amount    numeric(12,2) NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
  max_discount_amount numeric(12,2) CHECK (max_discount_amount IS NULL OR max_discount_amount > 0),
  starts_at           timestamptz,
  expires_at          timestamptz,
  usage_limit         integer CHECK (usage_limit IS NULL OR usage_limit > 0),
  per_user_limit      integer CHECK (per_user_limit IS NULL OR per_user_limit > 0),
  used_count          integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  store_id            uuid REFERENCES stores(id) ON DELETE CASCADE,
  category_id         uuid REFERENCES categories(id) ON DELETE CASCADE,
  is_active           boolean NOT NULL DEFAULT true,
  created_by          uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupons_percentage_range CHECK (type <> 'percentage' OR value BETWEEN 0 AND 100),
  CONSTRAINT coupons_period_valid CHECK (starts_at IS NULL OR expires_at IS NULL OR expires_at > starts_at)
);
CREATE TRIGGER coupons_set_updated_at BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE SEQUENCE order_number_seq START 1;

CREATE TABLE orders (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number             varchar(24) NOT NULL UNIQUE
    DEFAULT ('AB' || to_char(now(), 'YYMMDD') || lpad(nextval('order_number_seq')::text, 6, '0')),
  customer_id              uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  store_id                 uuid NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  driver_id                uuid REFERENCES users(id) ON DELETE RESTRICT,
  zone_id                  uuid REFERENCES delivery_zones(id) ON DELETE SET NULL,
  status                   order_status NOT NULL DEFAULT 'pending',
  payment_method           payment_method NOT NULL DEFAULT 'cash_on_delivery',
  payment_status           payment_status NOT NULL DEFAULT 'pending',
  currency                 char(3) NOT NULL,
  subtotal                 numeric(12,2) NOT NULL CHECK (subtotal >= 0),
  delivery_fee             numeric(12,2) NOT NULL CHECK (delivery_fee >= 0),
  discount_total           numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
  total                    numeric(12,2) NOT NULL CHECK (total >= 0),
  coupon_id                uuid REFERENCES coupons(id) ON DELETE SET NULL,
  customer_notes           text,
  -- نسخة ثابتة من العنوان وقت الطلب (لا تتأثر بتعديل العناوين لاحقًا)
  delivery_address_id      uuid REFERENCES addresses(id) ON DELETE SET NULL,
  delivery_address_text    varchar(400) NOT NULL,
  delivery_latitude        numeric(9,6) NOT NULL CHECK (delivery_latitude BETWEEN -90 AND 90),
  delivery_longitude       numeric(9,6) NOT NULL CHECK (delivery_longitude BETWEEN -180 AND 180),
  recipient_name           varchar(120) NOT NULL,
  recipient_phone          varchar(20) NOT NULL,
  estimated_delivery_at    timestamptz,
  -- OTP التسليم يُخزَّن كـ hash فقط
  delivery_otp_hash        char(64),
  delivery_otp_attempts    smallint NOT NULL DEFAULT 0 CHECK (delivery_otp_attempts >= 0),
  -- منع تكرار الطلب عند إعادة المحاولة
  idempotency_key          varchar(80) NOT NULL,
  placed_at                timestamptz NOT NULL DEFAULT now(),
  accepted_at              timestamptz,
  ready_at                 timestamptz,
  picked_up_at             timestamptz,
  delivered_at             timestamptz,
  cancelled_at             timestamptz,
  cancelled_by             uuid REFERENCES users(id) ON DELETE SET NULL,
  cancel_reason            text,
  reject_reason            text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_total_consistent CHECK (total = subtotal + delivery_fee - discount_total),
  CONSTRAINT orders_discount_not_over_amount CHECK (discount_total <= subtotal + delivery_fee),
  CONSTRAINT orders_idempotency_unique UNIQUE (customer_id, idempotency_key)
);
CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE order_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   uuid REFERENCES products(id) ON DELETE SET NULL,
  variant_id   uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  -- Snapshot: الاسم والسعر وقت الطلب
  product_name varchar(160) NOT NULL,
  variant_name varchar(120),
  unit_price   numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  quantity     integer NOT NULL CHECK (quantity BETWEEN 1 AND 100),
  line_total   numeric(12,2) NOT NULL CHECK (line_total >= 0),
  notes        varchar(300),
  CONSTRAINT order_items_line_total_consistent CHECK (line_total = unit_price * quantity)
);

CREATE TABLE order_status_history (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  from_status order_status,
  to_status   order_status NOT NULL,
  changed_by  uuid REFERENCES users(id) ON DELETE RESTRICT,
  actor_role  varchar(40) NOT NULL,
  note        text,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER order_status_history_append_only BEFORE UPDATE OR DELETE ON order_status_history
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();

CREATE TABLE coupon_usage (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id       uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id        uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  discount_amount numeric(12,2) NOT NULL CHECK (discount_amount >= 0),
  created_at      timestamptz NOT NULL DEFAULT now()
);
