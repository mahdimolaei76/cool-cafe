# عکس‌های پیش‌فرض منو

هر عکسی که در این پوشه قرار بگیرد، در بخش «انتخاب تصویر پیش‌فرض» موقع ایجاد یا ویرایش آیتم منو نمایش داده می‌شود.

## نحوه افزودن عکس جدید

1. عکس را (با فرمت `.jpg` ، `.png` یا `.webp`) در این پوشه قرار دهید.
2. نام فایل را در `manifest.json` اضافه کنید:

```json
[
  "coffee-hot.jpg",
  "coffee-cold.jpg",
  "cake.jpg",
  "my-new-image.jpg"
]
```

### اگر بک‌اند endpoint دارد (توصیه شده)

اگر بک‌اند endpoint `GET /api/menu/default-images` را پیاده‌سازی کرده، فایل‌ها به صورت خودکار از پوشه اسکن می‌شوند و نیازی به ویرایش `manifest.json` نیست.

```json
// Response format:
{ "images": ["coffee-hot.jpg", "cake.jpg", ...] }
```
