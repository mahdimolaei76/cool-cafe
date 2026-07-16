-- 010: takeaway flag, service charge, manual price override, payment events, takeaway fee setting

-- ── سفارشات بیرون‌بر ─────────────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_takeaway       BOOLEAN NOT NULL DEFAULT false;

-- ── سرویس (کل سفارش) ──────────────────────────────────────────────────────────
-- service_charge: مبلغی که کاربر دستی روی سفارش اضافه می‌کند (مثلاً هزینه سرویس)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_charge    BIGINT  NOT NULL DEFAULT 0;

-- ── تغییر مبلغ دستی ─────────────────────────────────────────────────────────
-- price_override: جمع نهایی جدیدی که مدیر/صندوقدار دستی تعیین کرده؛
--   NULL یعنی قیمت محاسباتی (subtotal - discount + service_charge) استفاده شود
ALTER TABLE orders ADD COLUMN IF NOT EXISTS price_override    BIGINT;

-- ── سرویس هر آیتم ───────────────────────────────────────────────────────────
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS service_charge BIGINT NOT NULL DEFAULT 0;

-- ── لاگ رویدادهای پرداخت (کنار timeline وضعیت) ──────────────────────────────
-- order_payment_events: تغییر روش پرداخت، تغییر مبلغ، پرداخت شد/نشد
-- این جدول کنار order_timeline نمایش داده می‌شود اما استایل متفاوت دارد
CREATE TABLE IF NOT EXISTS order_payment_events (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    kind       VARCHAR(30) NOT NULL,  -- 'price_override' | 'payment_method' | 'paid' | 'service_charge'
    old_value  TEXT,
    new_value  TEXT,
    note       TEXT DEFAULT '',
    cashier    TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_payment_events_order ON order_payment_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payment_events_created ON order_payment_events(created_at DESC);

-- ── هزینه بیرون‌بر در تنظیمات ──────────────────────────────────────────────
ALTER TABLE settings ADD COLUMN IF NOT EXISTS takeaway_fee_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS takeaway_fee         BIGINT  NOT NULL DEFAULT 0;
