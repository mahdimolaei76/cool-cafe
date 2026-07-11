import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Clock, Wifi, Search } from 'lucide-react';
import { useAppStore } from '@/store';

export default function MenuHero() {
  const { settings } = useAppStore();
  return (
    <div className="relative h-[50vh] min-h-[400px] overflow-hidden bg-zinc-950">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="/images/hero.jpg"
          alt="کافه COOL"
          className="w-full h-full object-cover scale-110 blur-[1px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-zinc-50 dark:to-zinc-950" />
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          {/* Logo Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-[1.5rem] shadow-2xl flex items-center justify-center mb-6"
          >
            <span className="text-brand-600 font-black text-3xl md:text-4xl" style={{ fontFamily: 'Playfair Display, serif' }}>C</span>
          </motion.div>

          {/* Name */}
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-none" style={{ fontFamily: 'Playfair Display, serif' }}>
            COOL
          </h1>
          <p className="text-brand-300 text-xs md:text-sm font-bold tracking-[0.4em] uppercase mt-2">
            Specialty Coffee
          </p>

          {/* Info pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-3"
          >
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/80 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              اکنون باز است
            </div>
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/80 text-xs">
              <Clock className="w-3.5 h-3.5" />
              {settings.workingHours || '۷ صبح – ۱۰ شب'}
            </div>
            <Link to="/track" className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-brand-800 text-xs font-bold shadow-sm hover:bg-white/90 transition-colors">
              <Search className="w-3.5 h-3.5" />
              پیگیری سفارش
            </Link>
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-5 text-white/50 text-sm font-light max-w-xs"
          >
            قهوه تخصصی · شیرینی دست‌ساز · فضای دنج
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
