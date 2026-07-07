import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Coffee, MapPin, Phone, Mail, Clock } from 'lucide-react';
import { useAppStore } from '@/store';

/**
 * Public "درباره ما" page. Content (aboutText) is edited from the admin
 * Settings page rather than hardcoded, so the café can update its own
 * introduction without a code change (item 11).
 */
export default function AboutPage() {
  const { settings } = useAppStore();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-brand-700 dark:hover:text-brand-400 transition-colors mb-6"
        >
          <ArrowRight className="w-4 h-4" />
          بازگشت به منو
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-brand-800 dark:bg-brand-600 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Coffee className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">درباره ما</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{settings.name}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800">
            <p className="text-zinc-700 dark:text-zinc-300 leading-8 whitespace-pre-line">
              {settings.aboutText || 'اطلاعاتی ثبت نشده است.'}
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800 mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-brand-600 flex-shrink-0" />
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{settings.address}</p>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-brand-600 flex-shrink-0" />
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{settings.workingHours}</p>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-brand-600 flex-shrink-0" />
              <p className="text-sm text-zinc-600 dark:text-zinc-400 font-mono" dir="ltr">{settings.phone}</p>
            </div>
            {settings.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-brand-600 flex-shrink-0" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400 font-mono" dir="ltr">{settings.email}</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
