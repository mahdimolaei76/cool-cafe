import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Store, Palette, Phone, Mail, MapPin } from 'lucide-react';
import { useAppStore } from '@/store';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function SettingsPage() {
  const { settings, updateSettings, theme, toggleTheme } = useAppStore();
  const [form, setForm] = useState({ ...settings });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره تغییرات با خطا مواجه شد');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">تنظیمات</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">مدیریت تنظیمات کافه</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button onClick={handleSave} disabled={saving} icon={saved ? undefined : <Save className="w-4 h-4" />}>
            {saving ? 'در حال ذخیره...' : saved ? '✓ ذخیره شد!' : 'ذخیره تغییرات'}
          </Button>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
                <Store className="w-5 h-5 text-brand-700 dark:text-brand-400" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">اطلاعات کافه</h3>
                <p className="text-xs text-zinc-400">مشخصات اصلی کافه</p>
              </div>
            </div>
            <div className="space-y-4">
              <Input label="نام کافه" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} icon={<Store className="w-4 h-4" />} />
              <Input label="تلفن" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} icon={<Phone className="w-4 h-4" />} />
              <Input label="ایمیل" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} icon={<Mail className="w-4 h-4" />} />
              <Input label="آدرس" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} icon={<MapPin className="w-4 h-4" />} />
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                <Palette className="w-5 h-5 text-purple-700 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">ظاهر</h3>
                <p className="text-xs text-zinc-400">تنظیمات ظاهری</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">تم</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { if (theme === 'dark') toggleTheme(); }}
                    className={`p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'}`}
                  >
                    <div className="w-full h-16 bg-white rounded-lg border border-zinc-200 mb-2 flex items-center justify-center">
                      <div className="w-8 h-2 bg-zinc-200 rounded" />
                    </div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">روشن</p>
                  </button>
                  <button
                    onClick={() => { if (theme === 'light') toggleTheme(); }}
                    className={`p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'}`}
                  >
                    <div className="w-full h-16 bg-zinc-900 rounded-lg border border-zinc-700 mb-2 flex items-center justify-center">
                      <div className="w-8 h-2 bg-zinc-700 rounded" />
                    </div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">تاریک</p>
                  </button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="mt-4">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">درباره</h3>
            <div className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
              <div className="flex justify-between"><span>نسخه</span><span className="font-mono text-zinc-900 dark:text-zinc-100" dir="ltr">1.0.0</span></div>
              <div className="flex justify-between"><span>پلتفرم</span><span className="text-zinc-900 dark:text-zinc-100">سیستم مدیریت کافه COOL</span></div>
              <div className="flex justify-between"><span>مجوز</span><span className="text-zinc-900 dark:text-zinc-100">تجاری</span></div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
