-- 007: notifications, devices, reviews, support

CREATE TABLE notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      varchar(160) NOT NULL,
  body       text NOT NULL,
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read    boolean NOT NULL DEFAULT false,
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notification_preferences (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type    notification_type NOT NULL,
  in_app  boolean NOT NULL DEFAULT true,
  push    boolean NOT NULL DEFAULT true,
  PRIMARY KEY (user_id, type)
);

-- توكنات أجهزة Push (تُستخدم خلف NotificationProvider)
CREATE TABLE device_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform     device_platform NOT NULL,
  token        text NOT NULL UNIQUE,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  driver_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  store_rating  smallint NOT NULL CHECK (store_rating BETWEEN 1 AND 5),
  driver_rating smallint CHECK (driver_rating IS NULL OR driver_rating BETWEEN 1 AND 5),
  comment       text,
  is_visible    boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, customer_id)
);

CREATE SEQUENCE ticket_number_seq START 1;

CREATE TABLE support_tickets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number varchar(20) NOT NULL UNIQUE
    DEFAULT ('TK' || lpad(nextval('ticket_number_seq')::text, 7, '0')),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id      uuid REFERENCES orders(id) ON DELETE SET NULL,
  subject       varchar(200) NOT NULL,
  status        ticket_status NOT NULL DEFAULT 'open',
  priority      ticket_priority NOT NULL DEFAULT 'normal',
  assigned_to   uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  closed_at     timestamptz
);
CREATE TRIGGER support_tickets_set_updated_at BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE support_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- ملاحظة داخلية للفريق لا تظهر للعميل
  is_internal boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
