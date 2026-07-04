-- ================================================
-- COOL Café — Customer order tracking support
-- ================================================
-- Adds a random, non-sequential, hard-to-guess tracking code to every
-- order so customers can look up status using {trackingCode + phone}
-- without needing an account or exposing the sequential order number.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_code VARCHAR(12);

-- Backfill any existing rows with a random code so the column can be
-- made unique/non-null going forward.
DO $$
DECLARE
    r RECORD;
    charset TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I to avoid ambiguity
    code TEXT;
    i INT;
BEGIN
    FOR r IN SELECT id FROM orders WHERE tracking_code IS NULL LOOP
        LOOP
            code := '';
            FOR i IN 1..8 LOOP
                code := code || substr(charset, floor(random() * length(charset) + 1)::int, 1);
            END LOOP;
            EXIT WHEN NOT EXISTS (SELECT 1 FROM orders WHERE tracking_code = code);
        END LOOP;
        UPDATE orders SET tracking_code = code WHERE id = r.id;
    END LOOP;
END $$;

ALTER TABLE orders ALTER COLUMN tracking_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_tracking_code ON orders(tracking_code);
