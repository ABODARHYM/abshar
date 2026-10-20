-- 019: Marib Seed Data

-- City: Marib
INSERT INTO cities (
  id, country_code, name_ar, name_en, slug,
  latitude, longitude, timezone, is_active, sort_order
)
VALUES (
  gen_random_uuid(), 'YE', 'مأرب', 'Marib', 'marib',
  15.4633, 45.3256, 'Asia/Aden', true, 1
)
ON CONFLICT (slug) DO NOTHING;

-- Districts (6)
DO $$
DECLARE v_city_id uuid;
BEGIN
  SELECT id INTO v_city_id FROM cities WHERE slug = 'marib';
  IF v_city_id IS NULL THEN RETURN; END IF;

  INSERT INTO districts (city_id, name_ar, name_en, slug, latitude, longitude, sort_order)
  VALUES
    (v_city_id, 'حي الروضة',       'Al-Rawdah',    'al-rawdah',    15.4633, 45.3256, 1),
    (v_city_id, 'حي الزهور',       'Al-Zuhour',    'al-zuhour',    15.4680, 45.3300, 2),
    (v_city_id, 'حي السلام',       'Al-Salam',     'al-salam',     15.4580, 45.3200, 3),
    (v_city_id, 'حي النهضة',       'Al-Nahdah',    'al-nahdah',    15.4700, 45.3180, 4),
    (v_city_id, 'المدينة القديمة', 'Old City',     'old-city',     15.4610, 45.3280, 5),
    (v_city_id, 'حي الوادي',       'Al-Wadi',      'al-wadi',      15.4550, 45.3350, 6)
  ON CONFLICT (city_id, slug) DO NOTHING;
END $$;

-- Areas (30 — 5 لكل حي)
DO $$
DECLARE
  v_city_id uuid;
  v_district RECORD;
  v_areas jsonb;
  v_area jsonb;
  v_idx int;
BEGIN
  SELECT id INTO v_city_id FROM cities WHERE slug = 'marib';
  IF v_city_id IS NULL THEN RETURN; END IF;

  FOR v_district IN
    SELECT id, slug, latitude, longitude FROM districts WHERE city_id = v_city_id
  LOOP
    CASE v_district.slug
      WHEN 'al-rawdah' THEN
        v_areas := '[
          {"ar":"شارع الروضة","en":"Al-Rawdah St.","slug":"rawda-main"},
          {"ar":"حي الشرطة","en":"Police District","slug":"rawda-police"},
          {"ar":"شارع المستشفى","en":"Hospital St.","slug":"rawda-hospital"},
          {"ar":"حي الجامع","en":"Mosque District","slug":"rawda-mosque"},
          {"ar":"شارع السوق","en":"Market St.","slug":"rawda-market"}
        ]'::jsonb;
      WHEN 'al-zuhour' THEN
        v_areas := '[
          {"ar":"شارع الزهور","en":"Al-Zuhour St.","slug":"zuhour-main"},
          {"ar":"حي المدارس","en":"Schools District","slug":"zuhour-schools"},
          {"ar":"شارع الحدائق","en":"Parks St.","slug":"zuhour-parks"},
          {"ar":"حي الأطباء","en":"Doctors District","slug":"zuhour-doctors"},
          {"ar":"الشارع التجاري","en":"Commercial St.","slug":"zuhour-commercial"}
        ]'::jsonb;
      WHEN 'al-salam' THEN
        v_areas := '[
          {"ar":"شارع السلام","en":"Al-Salam St.","slug":"salam-main"},
          {"ar":"حي الكرامة","en":"Dignity District","slug":"salam-dignity"},
          {"ar":"شارع الوحدة","en":"Unity St.","slug":"salam-unity"},
          {"ar":"حي النصر","en":"Victory District","slug":"salam-victory"},
          {"ar":"شارع الثورة","en":"Revolution St.","slug":"salam-revolution"}
        ]'::jsonb;
      WHEN 'al-nahdah' THEN
        v_areas := '[
          {"ar":"شارع النهضة","en":"Al-Nahdah St.","slug":"nahdah-main"},
          {"ar":"حي الصناعة","en":"Industrial District","slug":"nahdah-industrial"},
          {"ar":"شارع العمال","en":"Workers St.","slug":"nahdah-workers"},
          {"ar":"حي المزارع","en":"Farms District","slug":"nahdah-farms"},
          {"ar":"شارع الرياض","en":"Sports St.","slug":"nahdah-sports"}
        ]'::jsonb;
      WHEN 'old-city' THEN
        v_areas := '[
          {"ar":"السوق القديم","en":"Old Souq","slug":"old-souq"},
          {"ar":"الجامع الكبير","en":"Grand Mosque","slug":"old-mosque"},
          {"ar":"حي القلعة","en":"Castle District","slug":"old-castle"},
          {"ar":"شارع التراث","en":"Heritage St.","slug":"old-heritage"},
          {"ar":"حي الأصالة","en":"Authentic District","slug":"old-authentic"}
        ]'::jsonb;
      WHEN 'al-wadi' THEN
        v_areas := '[
          {"ar":"شارع الوادي","en":"Al-Wadi St.","slug":"wadi-main"},
          {"ar":"حي النخيل","en":"Palms District","slug":"wadi-palms"},
          {"ar":"شارع النهر","en":"River St.","slug":"wadi-river"},
          {"ar":"حي المزارع","en":"Farms","slug":"wadi-farms"},
          {"ar":"شارع السد","en":"Dam St.","slug":"wadi-dam"}
        ]'::jsonb;
      ELSE
        v_areas := '[]'::jsonb;
    END CASE;

    v_idx := 1;
    FOR v_area IN SELECT * FROM jsonb_array_elements(v_areas)
    LOOP
      INSERT INTO areas (
        district_id, name_ar, name_en, slug, latitude, longitude, sort_order
      )
      VALUES (
        v_district.id,
        v_area->>'ar', v_area->>'en', v_area->>'slug',
        v_district.latitude + (random() * 0.01 - 0.005),
        v_district.longitude + (random() * 0.01 - 0.005),
        v_idx
      )
      ON CONFLICT (district_id, slug) DO NOTHING;
      v_idx := v_idx + 1;
    END LOOP;
  END LOOP;
END $$;

-- Delivery Zones (6)
DO $$
DECLARE
  v_city_id uuid;
  v_district RECORD;
BEGIN
  SELECT id INTO v_city_id FROM cities WHERE slug = 'marib';
  IF v_city_id IS NULL THEN RETURN; END IF;

  FOR v_district IN
    SELECT id, name_ar, name_en FROM districts WHERE city_id = v_city_id
  LOOP
    INSERT INTO delivery_zones (
      city_id, district_id, city, name_ar, name_en,
      base_delivery_fee, fee_per_km, min_order_amount,
      free_delivery_threshold, surge_multiplier, fuel_surcharge,
      is_active
    )
    VALUES (
      v_city_id, v_district.id, 'مأرب',
      v_district.name_ar || ' — توصيل',
      v_district.name_en || ' Delivery',
      500, 150, 2000, 20000, 1.0, 0, true
    )
    ON CONFLICT (city, name_en) DO NOTHING;
  END LOOP;
END $$;
