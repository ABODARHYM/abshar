-- 023: Backfill customers for existing users with customer role
INSERT INTO customers (user_id, loyalty_points, referral_code)
SELECT
  u.id,
  0,
  'ABS-' || UPPER(SUBSTRING(u.id::text, 1, 8))
FROM users u
WHERE u.deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = u.id AND r.code = 'customer'
  )
  AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.user_id = u.id);
