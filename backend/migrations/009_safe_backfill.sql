-- 009: safe backfill — adds any columns that may have been missed by
-- previous migrations (006/007/008) on servers that deployed an older
-- binary before these migrations existed.
-- Every statement uses IF NOT EXISTS / DO NOTHING so it's idempotent.

-- From 006_customers
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_by_credit BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_paid        BOOLEAN NOT NULL DEFAULT false;

-- From 007_delivery_and_credit_history
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

-- From 008_menu_items_sort_order
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sort_order  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS price_type  VARCHAR(20) NOT NULL DEFAULT 'fixed';
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS price_label VARCHAR(100) NOT NULL DEFAULT '';

UPDATE menu_items m
SET sort_order = sub.rn
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY created_at) AS rn
    FROM menu_items
) sub
WHERE m.id = sub.id AND m.sort_order = 0;

CREATE INDEX IF NOT EXISTS idx_menu_items_sort ON menu_items(category_id, sort_order);

-- orders: tracking_code added in 002; safe repeat
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_code VARCHAR(20);
