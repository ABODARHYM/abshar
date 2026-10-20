-- 003: zones, addresses, customers, stores, drivers

CREATE TABLE delivery_zones (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city              varchar(80) NOT NULL,
  name_ar           varchar(120) NOT NULL,
  name_en           varchar(120) NOT NULL,
  -- GeoJSON Polygon (اختياري في FREE، يُستخدم في PRO للتحقق من النطاق)
  boundary          jsonb,
  base_delivery_fee numeric(12,2) NOT NULL DEFAULT 0 CHECK (base_delivery_fee >= 0),
  fee_per_km        numeric(12,2) NOT NULL DEFAULT 0 CHECK (fee_per_km >= 0),
  min_order_amount  numeric(12,2) NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city, name_en)
);
CREATE TRIGGER delivery_zones_set_updated_at BEFORE UPDATE ON delivery_zones
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE addresses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label        varchar(40) NOT NULL DEFAULT 'home',
  address_line varchar(255) NOT NULL,
  building     varchar(60),
  floor        varchar(20),
  apartment    varchar(20),
  landmark     varchar(160),
  latitude     numeric(9,6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude    numeric(9,6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  zone_id      uuid REFERENCES delivery_zones(id) ON DELETE SET NULL,
  is_default   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);
CREATE TRIGGER addresses_set_updated_at BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- عنوان افتراضي واحد فقط لكل مستخدم
CREATE UNIQUE INDEX addresses_one_default_per_user
  ON addresses (user_id) WHERE is_default AND deleted_at IS NULL;

CREATE TABLE customers (
  user_id            uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_address_id uuid REFERENCES addresses(id) ON DELETE SET NULL,
  loyalty_points     integer NOT NULL DEFAULT 0 CHECK (loyalty_points >= 0),  -- PRO
  referral_code      varchar(16) UNIQUE,                                     -- PRO
  referred_by        uuid REFERENCES users(id) ON DELETE SET NULL,           -- PRO
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER customers_set_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE stores (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id    uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  zone_id          uuid REFERENCES delivery_zones(id) ON DELETE SET NULL,
  name_ar          varchar(160) NOT NULL,
  name_en          varchar(160) NOT NULL,
  slug             varchar(180) NOT NULL UNIQUE,
  description_ar   text,
  description_en   text,
  logo_url         text,
  cover_url        text,
  phone            varchar(20),
  email            citext,
  address_text     varchar(255) NOT NULL,
  latitude         numeric(9,6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude        numeric(9,6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  status           store_status NOT NULL DEFAULT 'pending',
  is_open          boolean NOT NULL DEFAULT false,
  accepts_orders   boolean NOT NULL DEFAULT true,
  min_order_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
  delivery_fee     numeric(12,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  avg_prep_minutes smallint NOT NULL DEFAULT 20 CHECK (avg_prep_minutes BETWEEN 1 AND 600),
  rating_avg       numeric(3,2) NOT NULL DEFAULT 0 CHECK (rating_avg BETWEEN 0 AND 5),
  rating_count     integer NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
  -- نسبة عمولة خاصة بالمتجر؛ NULL = استخدم الافتراضي من settings
  commission_rate  numeric(5,2) CHECK (commission_rate IS NULL OR commission_rate BETWEEN 0 AND 100),
  is_featured      boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz
);
CREATE TRIGGER stores_set_updated_at BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE store_working_hours (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = الأحد
  opens_at    time NOT NULL,
  closes_at   time NOT NULL,
  is_closed   boolean NOT NULL DEFAULT false,
  UNIQUE (store_id, day_of_week, opens_at)
);

CREATE TABLE store_staff (
  store_id   uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  staff_role store_staff_role NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, user_id)
);

CREATE TABLE drivers (
  user_id          uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  zone_id          uuid REFERENCES delivery_zones(id) ON DELETE SET NULL,
  vehicle_type     varchar(30) NOT NULL DEFAULT 'motorcycle',
  vehicle_plate    varchar(20),
  id_document_url  text,
  license_url      text,
  status           driver_status NOT NULL DEFAULT 'pending',
  availability     driver_availability NOT NULL DEFAULT 'offline',
  rating_avg       numeric(3,2) NOT NULL DEFAULT 0 CHECK (rating_avg BETWEEN 0 AND 5),
  rating_count     integer NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
  -- آخر موقع معروف (نسخة سريعة للقراءة؛ التاريخ الكامل في driver_locations)
  last_latitude    numeric(9,6) CHECK (last_latitude BETWEEN -90 AND 90),
  last_longitude   numeric(9,6) CHECK (last_longitude BETWEEN -180 AND 180),
  last_location_at timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER drivers_set_updated_at BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
