-- ================================================
-- COOL Café — delivery timestamp + credit history
-- ================================================
-- delivered_at: set once, the moment an order's status becomes
-- 'delivered' (زمان تحویل سفارش). created_at already serves as زمان
-- گرفتن سفارش, so no change needed there.
--
-- credit_history: every change to a customer's credit_balance — manual
-- (افزایش اعتبار / خرید جدید / تسویه حساب کامل) or automatic (تحویل
-- سفارشی که با پرداخت اعتباری ثبت شده) — recorded so it can be shown
-- merged into the customer's "تاریخچه سفارشات" modal even though these
-- entries aren't tied to a specific order.
--
-- Payment methods now also include 'online' (اینترنتی) and 'credit'
-- (اعتباری) — payment_method has no CHECK constraint so no migration
-- is needed for that beyond documenting it here.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS credit_history (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,
    kind          VARCHAR(20) NOT NULL,
    amount        BIGINT NOT NULL,
    balance_after BIGINT NOT NULL,
    note          TEXT DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_history_customer ON credit_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_history_order    ON credit_history(order_id);
CREATE INDEX IF NOT EXISTS idx_credit_history_created  ON credit_history(created_at DESC);
