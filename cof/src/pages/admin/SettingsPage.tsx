import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Store, Palette, Phone, Mail, MapPin, Clock, Sun, Moon } from 'lucide-react';
import { useAppStore } from '@/store';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function SettingsPage() {
  const { settings, updateSettings, theme, toggleTheme } = useAppStore();
  const [form, setForm] = useState({ ...settings });

  // Re-sync form if settings are fetched after this page mounts
  // (e.g. navigating to settings before the initial fetch completes).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setForm({ ...settings }); }, [settings.name, settings.phone, settings.email, settings.address, settings.workingHours, settings.aboutText, settings.takeawayFeeEnabled, settings.takeawayFee]);
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
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">تنظیمات و اطلاعات</h1>
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
              <Input label="ساعت کاری" value={form.workingHours ?? ''} onChange={e => setForm(p => ({ ...p, workingHours: e.target.value }))} icon={<Clock className="w-4 h-4" />} placeholder="۷ صبح تا ۱۰ شب" />
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">درباره ما</label>
                <textarea
                  value={form.aboutText ?? ''}
                  onChange={e => setForm(p => ({ ...p, aboutText: e.target.value }))}
                  rows={4}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="متنی که در صفحه «درباره ما» به مشتری نمایش داده می‌شود"
                />
              </div>
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
                <div className="flex items-center justify-between px-1 py-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {theme === 'dark' ? 'حالت تاریک' : 'حالت روشن'}
                  </label>
                  <button
                    onClick={toggleTheme}
                    role="switch"
                    aria-checked={theme === 'dark'}
                    aria-label="تغییر حالت روشن/تاریک"
                    className={`w-14 h-8 rounded-full transition-colors relative flex-shrink-0 flex items-center px-1 ${theme === 'dark' ? 'bg-brand-600' : 'bg-zinc-300'}`}
                  >
                    <span className={`w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center transition-transform ${theme === 'dark' ? '-translate-x-6' : 'translate-x-0'}`}>
                      {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-brand-600" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="mt-4">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">درباره</h3>
            <div className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
              <div className="flex justify-between"><span>نسخه</span><span className="font-mono text-zinc-900 dark:text-zinc-100" dir="ltr">2.0.0</span></div>
              <div className="flex justify-between"><span>پلتفرم</span><span className="text-zinc-900 dark:text-zinc-100">سیستم مدیریت کافه COOL</span></div>
              <div className="flex justify-between"><span>مجوز</span><span className="text-zinc-900 dark:text-zinc-100">تجاری</span></div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
