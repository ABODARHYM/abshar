-- 011: بيانات مرجعية ضرورية لعمل النظام (الأدوار والصلاحيات والإعدادات الافتراضية)
-- ليست بيانات تجريبية؛ هذه تُطبَّق في كل البيئات.

INSERT INTO roles (code, name_ar, name_en, description) VALUES
  ('superAdmin',   'مدير عام',     'Super Admin',   'Full access including role management'),
  ('admin',        'مدير',         'Admin',         'Platform administration'),
  ('support',      'دعم فني',      'Support',       'Customer support agents'),
  ('finance',      'مالية',        'Finance',       'Finance and settlements'),
  ('storeOwner',   'مالك متجر',    'Store Owner',   'Owns and manages a store'),
  ('storeManager', 'مدير متجر',    'Store Manager', 'Manages store operations'),
  ('driver',       'مندوب',        'Driver',        'Delivery driver'),
  ('customer',     'عميل',         'Customer',      'End customer')
ON CONFLICT (code) DO NOTHING;

INSERT INTO permissions (code, description) VALUES
  ('users.read', 'View users'),
  ('users.manage', 'Create, edit, suspend users'),
  ('roles.manage', 'Manage roles and permissions'),
  ('customers.read', 'View customers'),
  ('stores.read', 'View all stores'),
  ('stores.manage', 'Create, edit, approve stores'),
  ('drivers.read', 'View all drivers'),
  ('drivers.manage', 'Create, edit, approve drivers'),
  ('orders.read', 'View all orders'),
  ('orders.manage', 'Change any order'),
  ('orders.assign_driver', 'Assign driver to order'),
  ('orders.cancel', 'Cancel any order'),
  ('products.read', 'View all products'),
  ('products.manage', 'Manage any product'),
  ('categories.manage', 'Manage platform categories'),
  ('zones.manage', 'Manage delivery zones'),
  ('coupons.manage', 'Manage coupons'),
  ('promotions.manage', 'Manage promotions'),
  ('banners.manage', 'Manage banners'),
  ('notifications.send', 'Send notifications'),
  ('support.read', 'View support tickets'),
  ('support.reply', 'Reply to support tickets'),
  ('support.manage', 'Assign and close support tickets'),
  ('finance.read', 'View finance data'),
  ('finance.manage', 'Create ledger adjustments'),
  ('settlements.manage', 'Create and approve settlements'),
  ('reports.read', 'View reports'),
  ('settings.manage', 'Manage system settings'),
  ('audit.read', 'View audit logs'),
  ('profile.manage_own', 'Manage own profile'),
  ('addresses.manage_own', 'Manage own addresses'),
  ('favorites.manage_own', 'Manage own favorites'),
  ('orders.create', 'Create an order'),
  ('orders.read_own', 'View own orders'),
  ('orders.cancel_own', 'Cancel own order while allowed'),
  ('reviews.create', 'Create review for own order'),
  ('support.create', 'Open support ticket'),
  ('store.profile.manage_own', 'Manage own store profile'),
  ('store.products.manage_own', 'Manage own store products'),
  ('store.orders.manage_own', 'Handle own store orders'),
  ('store.reports.read_own', 'View own store reports'),
  ('store.staff.manage_own', 'Manage own store staff'),
  ('driver.profile.manage_own', 'Manage own driver profile'),
  ('driver.tasks.manage_own', 'Handle own delivery tasks'),
  ('driver.earnings.read_own', 'View own earnings')
ON CONFLICT (code) DO NOTHING;

-- superAdmin: كل الصلاحيات
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.code = 'superAdmin'
ON CONFLICT DO NOTHING;

-- admin: كل شيء عدا إدارة الأدوار وصلاحيات المستخدم النهائي
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.code = 'admin'
  AND p.code <> 'roles.manage'
  AND p.code NOT LIKE '%.manage_own'
  AND p.code NOT LIKE '%.read_own'
  AND p.code NOT LIKE '%.cancel_own'
  AND p.code NOT IN ('orders.create', 'reviews.create', 'support.create')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = ANY (ARRAY[
  'users.read', 'customers.read', 'stores.read', 'drivers.read', 'orders.read',
  'support.read', 'support.reply', 'support.manage'
]) WHERE r.code = 'support'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = ANY (ARRAY[
  'finance.read', 'finance.manage', 'settlements.manage', 'reports.read',
  'orders.read', 'stores.read', 'drivers.read'
]) WHERE r.code = 'finance'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = ANY (ARRAY[
  'profile.manage_own', 'store.profile.manage_own', 'store.products.manage_own',
  'store.orders.manage_own', 'store.reports.read_own', 'store.staff.manage_own', 'support.create'
]) WHERE r.code = 'storeOwner'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = ANY (ARRAY[
  'profile.manage_own', 'store.profile.manage_own', 'store.products.manage_own',
  'store.orders.manage_own', 'store.reports.read_own', 'support.create'
]) WHERE r.code = 'storeManager'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = ANY (ARRAY[
  'profile.manage_own', 'driver.profile.manage_own', 'driver.tasks.manage_own',
  'driver.earnings.read_own', 'support.create'
]) WHERE r.code = 'driver'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = ANY (ARRAY[
  'profile.manage_own', 'addresses.manage_own', 'favorites.manage_own',
  'orders.create', 'orders.read_own', 'orders.cancel_own', 'reviews.create', 'support.create'
]) WHERE r.code = 'customer'
ON CONFLICT DO NOTHING;

INSERT INTO settings (key, value, description) VALUES
  ('currency', '"USD"'::jsonb, 'ISO 4217 currency code used for new orders - CHANGE to your market before launch'),
  ('commission.default_rate_percent', '10'::jsonb, 'Default platform commission on order subtotal'),
  ('delivery.otp_length', '4'::jsonb, 'Digits in delivery confirmation OTP'),
  ('delivery.otp_max_attempts', '5'::jsonb, 'Max wrong OTP attempts before order is flagged'),
  ('tracking.location_interval_seconds', '15'::jsonb, 'Driver GPS reporting interval (FREE default)'),
  ('tracking.min_interval_seconds', '5'::jsonb, 'Server rejects driver location updates faster than this'),
  ('orders.auto_cancel_pending_minutes', '15'::jsonb, 'Pending orders not accepted by the store are cancelled after this'),
  ('orders.max_items_per_order', '50'::jsonb, 'Maximum order lines per order'),
  ('storage.max_file_size_bytes', '5242880'::jsonb, 'Maximum upload size (5 MB)'),
  ('storage.allowed_mime_types', '["image/jpeg","image/png","image/webp"]'::jsonb, 'Allowed upload MIME types'),
  ('maps.default_provider', '"osm"'::jsonb, 'Maps provider key used by MapsProvider')
ON CONFLICT (key) DO NOTHING;
