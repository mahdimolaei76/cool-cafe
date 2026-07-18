-- 013: add staff_note and is_urgent to orders
-- staff_note: یادداشت داخلی از طرف صندوقدار/مدیر (با یادداشت مشتری متفاوت است)
-- is_urgent: فلگ فوری — صندوقدار موقع ثبت می‌زند
ALTER TABLE orders ADD COLUMN IF NOT EXISTS staff_note TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_urgent  BOOLEAN NOT NULL DEFAULT FALSE;
