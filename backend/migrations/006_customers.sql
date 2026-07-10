-- ================================================
-- Customers & credit payment (پرداخت اعتباری)
-- ================================================

-- Customers are managed explicitly (CRUD) from the admin panel and are
-- matched to orders by phone number. credit_balance can be positive
-- (customer has pre-paid / has credit) or negative (customer owes money);
-- a value of exactly 0 means "settled", which is also the only state in
-- which credit_enabled may be toggled (see service-layer validation).
CREATE TABLE IF NOT EXISTS customers (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone          VARCHAR(20) UNIQUE NOT NULL,
    first_name     VARCHAR(100) NOT NULL DEFAULT '',
    last_name      VARCHAR(100) NOT NULL DEFAULT '',
    credit_enabled BOOLEAN NOT NULL DEFAULT false,
    credit_balance BIGINT NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- paid_by_credit: this order's amount was charged to the customer's
-- credit account instead of collected at the register. is_paid: the
-- "پرداخت شد" checkbox shown alongside the payment method dropdown in
-- every order status-change modal.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_by_credit BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT false;
