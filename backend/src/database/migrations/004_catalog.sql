-- 004: categories, products, variants, favorites

CREATE TABLE categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- store_id = NULL  => تصنيف عام للمنصة؛ غير ذلك => تصنيف خاص بالمتجر
  store_id   uuid REFERENCES stores(id) ON DELETE CASCADE,
  parent_id  uuid REFERENCES categories(id) ON DELETE SET NULL,
  name_ar    varchar(120) NOT NULL,
  name_en    varchar(120) NOT NULL,
  image_url  text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id)
);
CREATE TRIGGER categories_set_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE UNIQUE INDEX categories_platform_name_unique
  ON categories (lower(name_ar)) WHERE store_id IS NULL;
CREATE UNIQUE INDEX categories_store_name_unique
  ON categories (store_id, lower(name_ar)) WHERE store_id IS NOT NULL;

ALTER TABLE stores
  ADD COLUMN platform_category_id uuid REFERENCES categories(id) ON DELETE SET NULL;

CREATE TABLE products (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category_id    uuid REFERENCES categories(id) ON DELETE SET NULL,
  name_ar        varchar(160) NOT NULL,
  name_en        varchar(160) NOT NULL,
  description_ar text,
  description_en text,
  base_price     numeric(12,2) NOT NULL CHECK (base_price >= 0),
  image_url      text,
  is_available   boolean NOT NULL DEFAULT true,
  -- NULL = مخزون غير محدود (يُدار بالتوفر فقط)
  stock_quantity integer CHECK (stock_quantity IS NULL OR stock_quantity >= 0),
  sort_order     integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz
);
CREATE TRIGGER products_set_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE product_variants (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name_ar      varchar(120) NOT NULL,
  name_en      varchar(120) NOT NULL,
  sku          varchar(60),
  price        numeric(12,2) NOT NULL CHECK (price >= 0),
  is_available boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER product_variants_set_updated_at BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE favorites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id   uuid REFERENCES stores(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT favorites_exactly_one_target
    CHECK ((store_id IS NOT NULL)::int + (product_id IS NOT NULL)::int = 1)
);
CREATE UNIQUE INDEX favorites_user_store_unique   ON favorites (user_id, store_id)   WHERE store_id IS NOT NULL;
CREATE UNIQUE INDEX favorites_user_product_unique ON favorites (user_id, product_id) WHERE product_id IS NOT NULL;
