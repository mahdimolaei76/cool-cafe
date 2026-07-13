-- 008: add sort_order to menu_items for per-category display ordering
-- Also adds price_type and price_label if they were added by a later migration.

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS price_type  VARCHAR(20) NOT NULL DEFAULT 'fixed';
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS price_label VARCHAR(100) NOT NULL DEFAULT '';

-- Backfill: give existing items a sensible initial order (oldest first per category).
UPDATE menu_items m
SET sort_order = sub.rn
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY created_at) AS rn
    FROM menu_items
) sub
WHERE m.id = sub.id AND m.sort_order = 0;

CREATE INDEX IF NOT EXISTS idx_menu_items_sort ON menu_items(category_id, sort_order);
