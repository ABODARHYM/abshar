-- 012: بيانات تجريبية (Demo) للمتاجر والمنتجات
-- تُستخدم للتطوير فقط. يمكن حذفها لاحقًا عند الإطلاق.

-- تصنيفات المنصة
INSERT INTO categories (id, store_id, name_ar, name_en, image_url, sort_order)
VALUES
  (gen_random_uuid(), NULL, 'مطاعم', 'Restaurants', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400', 1),
  (gen_random_uuid(), NULL, 'مقاهي', 'Cafes', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400', 2),
  (gen_random_uuid(), NULL, 'بقالات', 'Groceries', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400', 3),
  (gen_random_uuid(), NULL, 'صيدليات', 'Pharmacies', 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400', 4),
  (gen_random_uuid(), NULL, 'حلويات', 'Sweets', 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400', 5),
  (gen_random_uuid(), NULL, 'عصائر', 'Juices', 'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=400', 6)
ON CONFLICT DO NOTHING;

-- متجر تجريبي
DO $$
DECLARE
  v_owner_id uuid;
  v_store_id uuid;
  v_cat_food uuid;
  v_cat_drinks uuid;
BEGIN
  -- أنشئ مستخدم owner تجريبي إن لم يوجد
  INSERT INTO users (id, email, password_hash, full_name, status)
  VALUES (
    gen_random_uuid(),
    'store@example.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyLdNqKZQ5Q5Q5',  -- bcrypt of "Test12345"
    'صاحب المتجر التجريبي',
    'active'
  )
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO v_owner_id;

  -- إذا لم يوجد، اجلبه
  IF v_owner_id IS NULL THEN
    SELECT id INTO v_owner_id FROM users WHERE email = 'store@example.com';
  END IF;

  -- إذا لم يوجد owner، لا نستمر
  IF v_owner_id IS NULL THEN
    RAISE NOTICE 'Demo store owner not found, skipping demo stores';
    RETURN;
  END IF;

  -- أعطه دور storeOwner
  INSERT INTO user_roles (user_id, role_id)
  SELECT v_owner_id, id FROM roles WHERE code = 'storeOwner'
  ON CONFLICT DO NOTHING;

  -- أنشئ متجر تجريبي
  INSERT INTO stores (
    id, owner_user_id, name_ar, name_en, slug, description_ar, description_en,
    logo_url, cover_url, phone, address_text, latitude, longitude,
    status, is_open, accepts_orders, delivery_fee, avg_prep_minutes, rating_avg, rating_count
  )
  VALUES (
    gen_random_uuid(), v_owner_id,
    'مطعم البركة', 'Al-Baraka Restaurant', 'albaraka-restaurant',
    'مطعم يقدم أشهى المأكولات الشرقية', 'Authentic oriental cuisine',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
    '+967777111222', 'شارع تعز، صنعاء', 15.369445, 44.191006,
    'active', true, true, 500, 25, 4.7, 128
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_store_id;

  IF v_store_id IS NULL THEN
    SELECT id INTO v_store_id FROM stores WHERE slug = 'albaraka-restaurant';
  END IF;

  -- اجلب تصنيف داخل المتجر
  INSERT INTO categories (id, store_id, name_ar, name_en, sort_order)
  VALUES (gen_random_uuid(), v_store_id, 'وجبات رئيسية', 'Main Dishes', 1)
  RETURNING id INTO v_cat_food;

  INSERT INTO categories (id, store_id, name_ar, name_en, sort_order)
  VALUES (gen_random_uuid(), v_store_id, 'مشروبات', 'Drinks', 2)
  RETURNING id INTO v_cat_drinks;

  -- منتجات تجريبية
  INSERT INTO products (store_id, category_id, name_ar, name_en, description_ar, base_price, image_url, is_available)
  VALUES
    (v_store_id, v_cat_food, 'كبسة لحم', 'Lamb Kabsa', 'كبسة لحم طازجة مع أرز بسمتي', 3500, 'https://images.unsplash.com/photo-1633945274309-2c16c9682a8c?w=400', true),
    (v_store_id, v_cat_food, 'مندي دجاج', 'Chicken Mandi', 'مندي دجاج مشوي على الفحم', 2800, 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=400', true),
    (v_store_id, v_cat_food, 'برجر لحم', 'Beef Burger', 'برجر لحم بقري مع جبن شيدر', 2200, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', true),
    (v_store_id, v_cat_food, 'شاورما دجاج', 'Chicken Shawarma', 'شاورما دجاج مع صوص الثوم', 1500, 'https://images.unsplash.com/photo-1561651823-34feb02250e4?w=400', true),
    (v_store_id, v_cat_drinks, 'شاي أحمر', 'Red Tea', 'شاي أحمر ساخن', 300, 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400', true),
    (v_store_id, v_cat_drinks, 'عصير برتقال', 'Orange Juice', 'عصير برتقال طازج', 800, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400', true)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Demo store and products created successfully';
END $$;
