-- ═══════════════════════════════════════════════════════════
-- Migration 026: Demo Data — 10 Stores + Products (SCHEMA-ACCURATE)
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  v_city_id uuid;
  v_district_1 uuid;
  v_district_2 uuid;
  v_district_3 uuid;
  v_owner_id uuid;
  v_cat_rest uuid;
  v_cat_market uuid;
  v_cat_sweets uuid;
  v_cat_pharma uuid;
  v_cat_honey uuid;
  v_cat_drinks uuid;
  v_cat_veg uuid;
  v_cat_bakery uuid;
  v_cat_grill uuid;
  v_cat_fish uuid;
  v_store_id uuid;
BEGIN
  -- ═══ الأساسيات ═══
  SELECT id INTO v_city_id FROM cities WHERE name_ar LIKE '%مأرب%' LIMIT 1;

  SELECT id INTO v_district_1 FROM districts ORDER BY created_at LIMIT 1 OFFSET 0;
  SELECT id INTO v_district_2 FROM districts ORDER BY created_at LIMIT 1 OFFSET 1;
  SELECT id INTO v_district_3 FROM districts ORDER BY created_at LIMIT 1 OFFSET 2;

  -- صاحب المتجر — استخدم "صاحب المتجر التجريبي" أو مدير النظام
  SELECT id INTO v_owner_id FROM users WHERE full_name LIKE '%صاحب المتجر%' LIMIT 1;
  IF v_owner_id IS NULL THEN
    SELECT id INTO v_owner_id FROM users WHERE full_name LIKE '%مدير%' LIMIT 1;
  END IF;
  IF v_owner_id IS NULL THEN
    SELECT id INTO v_owner_id FROM users LIMIT 1;
  END IF;

  -- ═══ الفئات الموجودة ═══
  SELECT id INTO v_cat_rest FROM categories WHERE name_ar LIKE '%مطاعم%' LIMIT 1;
  SELECT id INTO v_cat_market FROM categories WHERE name_ar LIKE '%بقال%' LIMIT 1;
  SELECT id INTO v_cat_sweets FROM categories WHERE name_ar LIKE '%حلويات%' LIMIT 1;
  SELECT id INTO v_cat_pharma FROM categories WHERE name_ar LIKE '%صيدلي%' LIMIT 1;
  SELECT id INTO v_cat_drinks FROM categories WHERE name_ar LIKE '%عصائر%' LIMIT 1;

  -- الفئات غير الموجودة — أنشئ
  SELECT id INTO v_cat_honey FROM categories WHERE name_ar LIKE '%عسل%' LIMIT 1;
  IF v_cat_honey IS NULL THEN
    INSERT INTO categories (name_ar, name_en, sort_order) VALUES ('عسل وتمور', 'Honey & Dates', 20) RETURNING id INTO v_cat_honey;
  END IF;

  SELECT id INTO v_cat_veg FROM categories WHERE name_ar LIKE '%خضروات%' LIMIT 1;
  IF v_cat_veg IS NULL THEN
    INSERT INTO categories (name_ar, name_en, sort_order) VALUES ('خضروات وفواكه', 'Fruits & Vegetables', 21) RETURNING id INTO v_cat_veg;
  END IF;

  SELECT id INTO v_cat_bakery FROM categories WHERE name_ar LIKE '%مخبز%' LIMIT 1;
  IF v_cat_bakery IS NULL THEN
    INSERT INTO categories (name_ar, name_en, sort_order) VALUES ('مخبز', 'Bakery', 22) RETURNING id INTO v_cat_bakery;
  END IF;

  SELECT id INTO v_cat_grill FROM categories WHERE name_ar LIKE '%مشويات%' LIMIT 1;
  IF v_cat_grill IS NULL THEN
    INSERT INTO categories (name_ar, name_en, sort_order) VALUES ('مشويات', 'Grills', 23) RETURNING id INTO v_cat_grill;
  END IF;

  SELECT id INTO v_cat_fish FROM categories WHERE name_ar LIKE '%بحري%' LIMIT 1;
  IF v_cat_fish IS NULL THEN
    INSERT INTO categories (name_ar, name_en, sort_order) VALUES ('بحريات', 'Seafood', 24) RETURNING id INTO v_cat_fish;
  END IF;

  -- ═══════════════════════════════════════════════════════════
  -- Store 1: مطعم الشيباني
  -- ═══════════════════════════════════════════════════════════
  INSERT INTO stores (owner_user_id, city_id, district_id, platform_category_id, name_ar, name_en, slug,
    description_ar, logo_url, cover_url, phone, address_text,
    latitude, longitude, status, is_open,
    rating_avg, rating_count, delivery_fee, min_order_amount, avg_prep_minutes)
  VALUES (v_owner_id, v_city_id, v_district_1, v_cat_rest,
    'مطعم الشيباني', 'Al-Shaibani Restaurant', 'alshaibani-1',
    'أشهى المأكولات اليمنية الأصيلة — مندي، حنيذ، مظبي',
    'https://images.unsplash.com/photo-1579684947550-22e945225d9a?w=400&q=80',
    'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200&q=80',
    '+967777111333', 'شارع الأربعين، مأرب',
    15.4633, 45.3256, 'active', true,
    4.7, 890, 500, 3000, 35)
  RETURNING id INTO v_store_id;

  INSERT INTO products (store_id, category_id, name_ar, name_en, description_ar, base_price, image_url, is_available)
  VALUES
    (v_store_id, v_cat_rest, 'مندي لحم ضاني', 'Lamb Mandi', 'لحم ضاني طازج مع أرز بسمتي', 5500, 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=400&q=80', true),
    (v_store_id, v_cat_rest, 'حنيذ دجاج', 'Chicken Haneeth', 'دجاج مطبوخ بالطريقة التقليدية', 3200, 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&q=80', true),
    (v_store_id, v_cat_rest, 'مظبي دجاج', 'Grilled Chicken', 'دجاج مشوي على الفحم', 2800, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&q=80', true),
    (v_store_id, v_cat_rest, 'عصيدة يمنية', 'Yemeni Aseedah', 'طبق تقليدي بالعسل والسمن', 1500, NULL, true);

  -- ═══ Store 2: مشويات البخاري ═══
  INSERT INTO stores (owner_user_id, city_id, district_id, platform_category_id, name_ar, name_en, slug,
    description_ar, logo_url, cover_url, phone, address_text,
    latitude, longitude, status, is_open,
    rating_avg, rating_count, delivery_fee, min_order_amount, avg_prep_minutes)
  VALUES (v_owner_id, v_city_id, v_district_2, v_cat_grill,
    'مشويات البخاري', 'Al-Bukhari Grills', 'albukhari-1',
    'أشهى المشويات على الفحم',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80',
    'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=1200&q=80',
    '+967777222444', 'شارع الروضة، مأرب',
    15.4633, 45.3256, 'active', true,
    4.9, 1560, 600, 4000, 30)
  RETURNING id INTO v_store_id;

  INSERT INTO products (store_id, category_id, name_ar, name_en, base_price, image_url, is_available)
  VALUES
    (v_store_id, v_cat_grill, 'كباب لحم', 'Beef Kebab', 3500, 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400&q=80', true),
    (v_store_id, v_cat_grill, 'تكة دجاج', 'Chicken Tikka', 2800, 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=400&q=80', true),
    (v_store_id, v_cat_grill, 'ريش غنم', 'Lamb Chops', 4800, NULL, true),
    (v_store_id, v_cat_grill, 'مشكل مشاوي', 'Mixed Grill', 6500, 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80', true);

  -- ═══ Store 3: حلويات السلطان ═══
  INSERT INTO stores (owner_user_id, city_id, district_id, platform_category_id, name_ar, name_en, slug,
    description_ar, logo_url, cover_url, phone, address_text,
    latitude, longitude, status, is_open,
    rating_avg, rating_count, delivery_fee, min_order_amount, avg_prep_minutes)
  VALUES (v_owner_id, v_city_id, v_district_3, v_cat_sweets,
    'حلويات السلطان', 'Al-Sultan Sweets', 'alsultan-1',
    'حلويات شرقية وغربية طازجة يومياً',
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80',
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&q=80',
    '+967777333555', 'شارع الحصبة، مأرب',
    15.4633, 45.3256, 'active', true,
    4.6, 720, 400, 2000, 25)
  RETURNING id INTO v_store_id;

  INSERT INTO products (store_id, category_id, name_ar, name_en, base_price, image_url, is_available)
  VALUES
    (v_store_id, v_cat_sweets, 'بسبوسة', 'Basbousa', 800, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80', true),
    (v_store_id, v_cat_sweets, 'بقلاوة', 'Baklava', 1200, 'https://images.unsplash.com/photo-1519676867240-f03562e64548?w=400&q=80', true),
    (v_store_id, v_cat_sweets, 'كنافة', 'Kunafa', 1500, NULL, true),
    (v_store_id, v_cat_sweets, 'كيك شوكولاتة', 'Chocolate Cake', 2500, NULL, true);

  -- ═══ Store 4: سوبر ماركت النخبة ═══
  INSERT INTO stores (owner_user_id, city_id, district_id, platform_category_id, name_ar, name_en, slug,
    description_ar, logo_url, cover_url, phone, address_text,
    latitude, longitude, status, is_open,
    rating_avg, rating_count, delivery_fee, min_order_amount, avg_prep_minutes)
  VALUES (v_owner_id, v_city_id, v_district_1, v_cat_market,
    'سوبر ماركت النخبة', 'Al-Nokhba Market', 'alnokhba-1',
    'كل ما تحتاجه في مكان واحد',
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
    'https://images.unsplash.com/photo-1601599963565-b7fa7d3e8bf4?w=1200&q=80',
    '+967777444666', 'شارع المدينة، مأرب',
    15.4633, 45.3256, 'active', true,
    4.5, 980, 300, 1000, 40)
  RETURNING id INTO v_store_id;

  INSERT INTO products (store_id, category_id, name_ar, name_en, base_price, image_url, is_available)
  VALUES
    (v_store_id, v_cat_market, 'أرز بسمتي 5 كجم', 'Basmati Rice 5kg', 6500, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80', true),
    (v_store_id, v_cat_market, 'زيت ذرة 1.8 لتر', 'Corn Oil 1.8L', 3200, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80', true),
    (v_store_id, v_cat_market, 'سكر 2 كجم', 'Sugar 2kg', 1800, NULL, true),
    (v_store_id, v_cat_market, 'حليب طازج 1 لتر', 'Fresh Milk 1L', 800, 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&q=80', true);

  -- ═══ Store 5: عصائر الفجر ═══
  INSERT INTO stores (owner_user_id, city_id, district_id, platform_category_id, name_ar, name_en, slug,
    description_ar, logo_url, cover_url, phone, address_text,
    latitude, longitude, status, is_open,
    rating_avg, rating_count, delivery_fee, min_order_amount, avg_prep_minutes)
  VALUES (v_owner_id, v_city_id, v_district_2, v_cat_drinks,
    'عصائر الفجر', 'Al-Fajr Juices', 'alfajr-1',
    'عصائر طازجة 100% بدون سكر مضاف',
    'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&q=80',
    'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=1200&q=80',
    '+967777555777', 'جولة مأرب، قرب السوق',
    15.4633, 45.3256, 'active', true,
    4.8, 560, 300, 1000, 15)
  RETURNING id INTO v_store_id;

  INSERT INTO products (store_id, category_id, name_ar, name_en, base_price, image_url, is_available)
  VALUES
    (v_store_id, v_cat_drinks, 'عصير مانجو', 'Mango Juice', 700, 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80', true),
    (v_store_id, v_cat_drinks, 'عصير برتقال', 'Orange Juice', 600, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&q=80', true),
    (v_store_id, v_cat_drinks, 'عصير رمان', 'Pomegranate Juice', 900, NULL, true),
    (v_store_id, v_cat_drinks, 'عصير أفوكادو', 'Avocado Juice', 1200, NULL, true);

  -- ═══ Store 6: صيدلية الشفاء ═══
  INSERT INTO stores (owner_user_id, city_id, district_id, platform_category_id, name_ar, name_en, slug,
    description_ar, logo_url, cover_url, phone, address_text,
    latitude, longitude, status, is_open,
    rating_avg, rating_count, delivery_fee, min_order_amount, avg_prep_minutes)
  VALUES (v_owner_id, v_city_id, v_district_3, v_cat_pharma,
    'صيدلية الشفاء', 'Al-Shifa Pharmacy', 'alshifa-1',
    'كل الأدوية والمستلزمات الطبية',
    NULL,
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=1200&q=80',
    '+967777666888', 'شارع المستشفى، مأرب',
    15.4633, 45.3256, 'active', true,
    4.9, 1240, 500, 1000, 20)
  RETURNING id INTO v_store_id;

  INSERT INTO products (store_id, category_id, name_ar, name_en, base_price, image_url, is_available)
  VALUES
    (v_store_id, v_cat_pharma, 'بانادول', 'Panadol', 500, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80', true),
    (v_store_id, v_cat_pharma, 'فيتامين C', 'Vitamin C', 1500, 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=400&q=80', true),
    (v_store_id, v_cat_pharma, 'كمامات طبية (50)', 'Medical Masks', 800, NULL, true),
    (v_store_id, v_cat_pharma, 'معقم يدين', 'Hand Sanitizer', 600, NULL, true);

  -- ═══ Store 7: عسل وتمور الجزيرة ═══
  INSERT INTO stores (owner_user_id, city_id, district_id, platform_category_id, name_ar, name_en, slug,
    description_ar, logo_url, cover_url, phone, address_text,
    latitude, longitude, status, is_open,
    rating_avg, rating_count, delivery_fee, min_order_amount, avg_prep_minutes)
  VALUES (v_owner_id, v_city_id, v_district_1, v_cat_honey,
    'عسل وتمور الجزيرة', 'Al-Jazira Honey', 'aljazirah-1',
    'أجود أنواع العسل اليمني والتمور',
    'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&q=80',
    'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=1200&q=80',
    '+967777888999', 'سوق التوتي، مأرب',
    15.4633, 45.3256, 'active', true,
    5.0, 340, 800, 2000, 30)
  RETURNING id INTO v_store_id;

  INSERT INTO products (store_id, category_id, name_ar, name_en, base_price, image_url, is_available)
  VALUES
    (v_store_id, v_cat_honey, 'عسل سدر يمني 1 كجم', 'Yemeni Sidr Honey 1kg', 25000, 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&q=80', true),
    (v_store_id, v_cat_honey, 'عسل جبلي 500 جم', 'Mountain Honey 500g', 8000, NULL, true),
    (v_store_id, v_cat_honey, 'تمر مجدول 1 كجم', 'Medjool Dates 1kg', 4500, 'https://images.unsplash.com/photo-1593008213089-123c0f0d1f5a?w=400&q=80', true),
    (v_store_id, v_cat_honey, 'تمر سكري 500 جم', 'Sukkari Dates 500g', 2500, NULL, true);

  -- ═══ Store 8: خضروات وفواكه طازجة ═══
  INSERT INTO stores (owner_user_id, city_id, district_id, platform_category_id, name_ar, name_en, slug,
    description_ar, logo_url, cover_url, phone, address_text,
    latitude, longitude, status, is_open,
    rating_avg, rating_count, delivery_fee, min_order_amount, avg_prep_minutes)
  VALUES (v_owner_id, v_city_id, v_district_2, v_cat_veg,
    'خضروات وفواكه طازجة', 'Fresh Produce', 'freshveggies-1',
    'من المزرعة إلى بابك مباشرة',
    'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=400&q=80',
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80',
    '+967777999000', 'سوق الخضار، مأرب',
    15.4633, 45.3256, 'active', true,
    4.7, 420, 400, 1500, 25)
  RETURNING id INTO v_store_id;

  INSERT INTO products (store_id, category_id, name_ar, name_en, base_price, image_url, is_available)
  VALUES
    (v_store_id, v_cat_veg, 'طماطم 1 كجم', 'Tomatoes 1kg', 600, 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&q=80', true),
    (v_store_id, v_cat_veg, 'خيار 1 كجم', 'Cucumbers 1kg', 500, 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=400&q=80', true),
    (v_store_id, v_cat_veg, 'بطاطس 2 كجم', 'Potatoes 2kg', 800, 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=80', true),
    (v_store_id, v_cat_veg, 'موز 1 كجم', 'Bananas 1kg', 700, 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&q=80', true),
    (v_store_id, v_cat_veg, 'تفاح أحمر 1 كجم', 'Red Apples 1kg', 1200, 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&q=80', true);

  -- ═══ Store 9: مخبز الصباح ═══
  INSERT INTO stores (owner_user_id, city_id, district_id, platform_category_id, name_ar, name_en, slug,
    description_ar, logo_url, cover_url, phone, address_text,
    latitude, longitude, status, is_open,
    rating_avg, rating_count, delivery_fee, min_order_amount, avg_prep_minutes)
  VALUES (v_owner_id, v_city_id, v_district_3, v_cat_bakery,
    'مخبز الصباح', 'Al-Sabah Bakery', 'alsabah-1',
    'خبز طازج يومياً من الفرن مباشرة',
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80',
    'https://images.unsplash.com/photo-1568254183919-78a4f43a2877?w=1200&q=80',
    '+967777000111', 'حي الروضة، مأرب',
    15.4633, 45.3256, 'active', true,
    4.8, 680, 200, 500, 20)
  RETURNING id INTO v_store_id;

  INSERT INTO products (store_id, category_id, name_ar, name_en, base_price, image_url, is_available)
  VALUES
    (v_store_id, v_cat_bakery, 'خبز تنور', 'Tandoor Bread', 200, NULL, true),
    (v_store_id, v_cat_bakery, 'خبز صمون', 'Samoon Bread', 300, NULL, true),
    (v_store_id, v_cat_bakery, 'خبز شامي', 'Pita Bread', 250, 'https://images.unsplash.com/photo-1587241321921-91a834d6d191?w=400&q=80', true),
    (v_store_id, v_cat_bakery, 'خبز أسمر', 'Brown Bread', 400, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80', true);

  -- ═══ Store 10: بحريات البحر الأحمر ═══
  INSERT INTO stores (owner_user_id, city_id, district_id, platform_category_id, name_ar, name_en, slug,
    description_ar, logo_url, cover_url, phone, address_text,
    latitude, longitude, status, is_open,
    rating_avg, rating_count, delivery_fee, min_order_amount, avg_prep_minutes)
  VALUES (v_owner_id, v_city_id, v_district_1, v_cat_fish,
    'بحريات البحر الأحمر', 'Red Sea Seafood', 'redsea-1',
    'أسماك طازجة ومشويات بحرية',
    'https://images.unsplash.com/photo-1510130387422-82bed34b37e9?w=400&q=80',
    'https://images.unsplash.com/photo-1580959375944-abd7e991f971?w=1200&q=80',
    '+967777101010', 'شارع البحر، مأرب',
    15.4633, 45.3256, 'active', true,
    4.9, 410, 700, 5000, 45)
  RETURNING id INTO v_store_id;

  INSERT INTO products (store_id, category_id, name_ar, name_en, base_price, image_url, is_available)
  VALUES
    (v_store_id, v_cat_fish, 'سمك هامور مشوي', 'Grilled Hamour', 7500, 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=400&q=80', true),
    (v_store_id, v_cat_fish, 'ربيان مقلي', 'Fried Shrimp', 5500, 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400&q=80', true),
    (v_store_id, v_cat_fish, 'سيادي (حبار)', 'Calamari', 4500, NULL, true),
    (v_store_id, v_cat_fish, 'مشكل بحري', 'Seafood Mix', 9500, NULL, true);

  RAISE NOTICE '✅ 10 stores + products inserted';
END $$;
