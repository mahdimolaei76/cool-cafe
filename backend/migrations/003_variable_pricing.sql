-- ================================================
-- COOL Café — Variable-priced item support
-- ================================================
-- Some menu items (e.g. "قیمت بازار" / market-price items) don't have a
-- single fixed price. This lets a menu item be marked 'variable': it can
-- still be added to an order, but its price is entered by a cashier
-- later (when processing/confirming the order) instead of being fixed
-- up front. Until priced, these items don't count toward the order's
-- subtotal/total — they're tracked separately, like a line the cashier
-- still needs to settle, rather than silently treated as free.

ALTER TABLE menu_items
    ADD COLUMN IF NOT EXISTS price_type VARCHAR(10) NOT NULL DEFAULT 'fixed',
    ADD COLUMN IF NOT EXISTS price_label VARCHAR(100) DEFAULT '';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_menu_items_price_type'
    ) THEN
        ALTER TABLE menu_items
            ADD CONSTRAINT chk_menu_items_price_type CHECK (price_type IN ('fixed', 'variable'));
    END IF;
END $$;

ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS is_price_variable BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS price_confirmed BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS price_label VARCHAR(100) DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_order_items_unconfirmed
    ON order_items(order_id) WHERE price_confirmed = false;
