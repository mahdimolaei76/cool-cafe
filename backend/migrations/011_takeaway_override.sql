-- 011: takeaway_override columns (نگه داشته شده برای backward compatibility ولی استفاده نمی‌شود)
-- isTakeaway روی هر سفارش نوع تحویل را مشخص می‌کند (بیرون‌بر / در محل)
-- هزینه بیرون‌بر از جدول settings (takeaway_fee) خوانده می‌شود نه از order
ALTER TABLE orders ADD COLUMN IF NOT EXISTS takeaway_override BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS takeaway_fee      BIGINT  DEFAULT 0;
