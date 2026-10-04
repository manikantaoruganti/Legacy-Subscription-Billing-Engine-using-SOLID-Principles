-- Clean existing data to ensure deterministic seeding
TRUNCATE TABLE subscriptions, users CASCADE;

-- Seed Users
INSERT INTO users (id, stripe_customer_id) VALUES
('user-expired-001', 'cus_mock_expired_001'),
('user-active-001', 'cus_mock_active_001'),
('user-december-001', 'cus_mock_december_001');

-- Seed Subscriptions
-- 1. Expired subscription (Expired on Dec 1, 2024)
INSERT INTO subscriptions (id, user_id, base_price, expires_at) VALUES
('sub-expired-001', 'user-expired-001', 100.00, '2024-12-01 00:00:00+00'),
-- 2. Active subscription (Expires on Dec 1, 2035)
('sub-active-001', 'user-active-001', 100.00, '2035-12-01 00:00:00+00'),
-- 3. Expired subscription for December discount testing (Expired on Dec 1, 2024)
('sub-december-001', 'user-december-001', 150.00, '2024-12-01 00:00:00+00');
