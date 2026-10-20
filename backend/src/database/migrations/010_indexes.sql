-- 010: Indexes (قراءة كثيفة + مفاتيح أجنبية). FK لا يُفهرَس تلقائيًا في PostgreSQL.

-- orders
CREATE INDEX orders_status_idx             ON orders (status);
CREATE INDEX orders_customer_created_idx   ON orders (customer_id, created_at DESC);
CREATE INDEX orders_store_status_created_idx ON orders (store_id, status, created_at DESC);
CREATE INDEX orders_driver_status_idx      ON orders (driver_id, status) WHERE driver_id IS NOT NULL;
CREATE INDEX orders_created_at_idx         ON orders (created_at DESC);
CREATE INDEX orders_zone_idx               ON orders (zone_id);
CREATE INDEX order_items_order_idx         ON order_items (order_id);
CREATE INDEX order_items_product_idx       ON order_items (product_id);
CREATE INDEX order_status_history_order_idx ON order_status_history (order_id, created_at);

-- tracking / dispatch
CREATE INDEX driver_locations_driver_time_idx ON driver_locations (driver_id, recorded_at DESC);
CREATE INDEX driver_locations_order_time_idx  ON driver_locations (order_id, recorded_at DESC) WHERE order_id IS NOT NULL;
CREATE INDEX driver_assignments_driver_status_idx ON driver_assignments (driver_id, status);
CREATE INDEX driver_assignments_order_idx         ON driver_assignments (order_id);
CREATE INDEX drivers_dispatch_idx ON drivers (zone_id, availability) WHERE status = 'active';

-- catalog
CREATE INDEX products_store_idx          ON products (store_id) WHERE deleted_at IS NULL;
CREATE INDEX products_category_idx       ON products (category_id) WHERE deleted_at IS NULL;
CREATE INDEX product_variants_product_idx ON product_variants (product_id);
CREATE INDEX categories_store_idx        ON categories (store_id, sort_order);
CREATE INDEX categories_parent_idx       ON categories (parent_id);
CREATE INDEX stores_zone_status_idx      ON stores (zone_id, status) WHERE deleted_at IS NULL;
CREATE INDEX stores_open_idx             ON stores (status, is_open) WHERE deleted_at IS NULL;
CREATE INDEX stores_platform_category_idx ON stores (platform_category_id);
CREATE INDEX stores_owner_idx            ON stores (owner_user_id);
CREATE INDEX store_staff_user_idx        ON store_staff (user_id);
CREATE INDEX store_working_hours_store_idx ON store_working_hours (store_id);
CREATE INDEX favorites_user_idx          ON favorites (user_id, created_at DESC);

-- البحث النصي (ILIKE '%...%') عبر pg_trgm
CREATE INDEX products_name_ar_trgm ON products USING gin (name_ar gin_trgm_ops);
CREATE INDEX products_name_en_trgm ON products USING gin (name_en gin_trgm_ops);
CREATE INDEX stores_name_ar_trgm   ON stores   USING gin (name_ar gin_trgm_ops);
CREATE INDEX stores_name_en_trgm   ON stores   USING gin (name_en gin_trgm_ops);

-- users / sessions
CREATE INDEX user_roles_role_idx              ON user_roles (role_id);
CREATE INDEX refresh_tokens_user_idx          ON refresh_tokens (user_id);
CREATE INDEX refresh_tokens_family_idx        ON refresh_tokens (family_id);
CREATE INDEX refresh_tokens_expires_idx       ON refresh_tokens (expires_at);
CREATE INDEX password_reset_tokens_user_idx   ON password_reset_tokens (user_id);
CREATE INDEX addresses_user_idx               ON addresses (user_id) WHERE deleted_at IS NULL;

-- notifications
CREATE INDEX notifications_user_created_idx ON notifications (user_id, created_at DESC);
CREATE INDEX notifications_user_unread_idx  ON notifications (user_id) WHERE NOT is_read;
CREATE INDEX device_tokens_user_idx         ON device_tokens (user_id);

-- coupons / reviews / support
CREATE INDEX coupons_store_idx           ON coupons (store_id) WHERE store_id IS NOT NULL;
CREATE INDEX coupons_active_idx          ON coupons (is_active, expires_at);
CREATE INDEX coupon_usage_coupon_user_idx ON coupon_usage (coupon_id, user_id);
CREATE INDEX reviews_store_created_idx   ON reviews (store_id, created_at DESC) WHERE is_visible;
CREATE INDEX reviews_driver_idx          ON reviews (driver_id) WHERE driver_id IS NOT NULL;
CREATE INDEX support_tickets_user_status_idx ON support_tickets (user_id, status);
CREATE INDEX support_tickets_queue_idx   ON support_tickets (status, priority, created_at);
CREATE INDEX support_tickets_assigned_idx ON support_tickets (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX support_messages_ticket_idx ON support_messages (ticket_id, created_at);

-- finance
CREATE INDEX payments_order_idx          ON payments (order_id);
CREATE INDEX transactions_order_idx      ON transactions (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX transactions_account_idx    ON transactions (account_type, account_id, created_at DESC);
CREATE INDEX transactions_settlement_idx ON transactions (settlement_id) WHERE settlement_id IS NOT NULL;
CREATE INDEX commissions_store_idx       ON commissions (store_id, created_at DESC);
CREATE INDEX settlements_party_idx       ON settlements (party_type, party_id, status);

-- platform content / audit
CREATE INDEX banners_active_idx          ON banners (is_active, sort_order);
CREATE INDEX promotions_active_idx       ON promotions (is_active, starts_at, ends_at);
CREATE INDEX audit_logs_entity_idx       ON audit_logs (entity_type, entity_id);
CREATE INDEX audit_logs_actor_idx        ON audit_logs (actor_user_id, created_at DESC);
CREATE INDEX audit_logs_created_idx      ON audit_logs (created_at DESC);
