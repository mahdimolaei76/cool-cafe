-- ================================================
-- COOL Café — Café settings
-- ================================================
-- A single-row table holding the café's general info (name/phone/email/
-- address), edited from the admin Settings page and shown publicly on
-- the customer menu sidebar. Enforced as a singleton via the CHECK
-- constraint (id must be 1), so there's never more than one row to
-- read/update.

CREATE TABLE IF NOT EXISTS settings (
    id         INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    name       VARCHAR(200) NOT NULL DEFAULT 'کافه COOL',
    phone      VARCHAR(30)  NOT NULL DEFAULT '',
    email      VARCHAR(150) NOT NULL DEFAULT '',
    address    VARCHAR(300) NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO settings (id, name, phone, email, address)
VALUES (1, 'کافه COOL', '۰۲۱-۱۲۳۴۵۶۷۸', 'info@coolcafe.ir', 'تهران، خیابان ولیعصر')
ON CONFLICT (id) DO NOTHING;
