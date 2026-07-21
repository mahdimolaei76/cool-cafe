-- 014: guard settings columns added in 010
-- Safe to run even if columns already exist (IF NOT EXISTS).
-- Ensures takeaway_fee_enabled and takeaway_fee exist on any DB
-- that skipped migration 010 (e.g. deployed before that migration).
ALTER TABLE settings ADD COLUMN IF NOT EXISTS takeaway_fee_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS takeaway_fee         BIGINT  NOT NULL DEFAULT 0;
