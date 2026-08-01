-- ================================================
-- COOL Café — 016: Update settings with real data
-- ================================================

UPDATE settings SET
  name                 = 'کول',
  phone                = '09364235913',
  email                = 'info@coolcafe.ir',
  address              = 'زرند - خیابان مدرس - کوچه مخابرات',
  working_hours        = 'صبح از 8 تا 14 و عصر از 16:30 تا 21:30',
  about_text           = 'کافه COOL با هدف ارائه بهترین تجربه نوشیدنی و غذا در فضایی گرم و صمیمی راه‌اندازی شده است.',
  takeaway_fee_enabled = false,
  takeaway_fee         = 0,
  updated_at           = now()
WHERE id = 1;

-- اگر به هر دلیلی ردیف وجود نداشت، insert کن
INSERT INTO settings (id, name, phone, email, address, working_hours, about_text,
                      takeaway_fee_enabled, takeaway_fee)
SELECT 1, 'کول', '09364235913', 'info@coolcafe.ir', 'زرند - خیابان مدرس - کوچه مخابرات',
       'صبح از 8 تا 14 و عصر از 16:30 تا 21:30', 'کافه COOL با هدف ارائه بهترین تجربه نوشیدنی و غذا در فضایی گرم و صمیمی راه‌اندازی شده است.', false, 0
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE id = 1);
