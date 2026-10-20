-- 020: Currency Switch to YER

UPDATE settings
SET value = '"YER"'::jsonb,
    description = 'ISO 4217 currency code — Yemeni Rial',
    updated_at = now()
WHERE key = 'currency';

-- تحديث أي settings مالية
INSERT INTO settings (key, value, description) VALUES
  ('pricing.currency_symbol', '"ر.ي"'::jsonb, 'Currency symbol for display')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
