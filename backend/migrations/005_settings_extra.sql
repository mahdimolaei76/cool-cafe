-- ================================================
-- COOL Café — extra settings fields
-- ================================================
-- Adds:
--   working_hours : free-text working hours, previously hardcoded in the
--                   frontend as "۷ صبح تا ۱۰ شب" (item 7).
--   about_text    : free-text shown on the public "درباره ما" page (item 11).
--   footer_icons  : JSON array of up to 5 { icon, link } entries used to
--                   drive the two dynamic bottom-nav icons (item 8). Stored
--                   as JSONB rather than fixed columns so the admin can add/
--                   edit/remove entries without another migration.

ALTER TABLE settings ADD COLUMN IF NOT EXISTS working_hours VARCHAR(100) NOT NULL DEFAULT '۷ صبح تا ۱۰ شب';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS about_text TEXT NOT NULL DEFAULT 'کافه COOL با هدف ارائه بهترین تجربه نوشیدنی و غذا در فضایی گرم و صمیمی راه‌اندازی شده است.';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS footer_icons JSONB NOT NULL DEFAULT '[]'::jsonb;
