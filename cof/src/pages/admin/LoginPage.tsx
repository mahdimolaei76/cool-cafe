import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, User, Eye, EyeOff, Coffee } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import Button from '@/components/ui/Button';
import Banner from '@/components/ui/Banner';
const logoIcon = '/images/logo.jpg'

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore(s => s.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const toastId = toast.loading('در حال ورود...');
    const success = await login(username, password);

    if (success) {
      toast.success('خوش آمدید! 👋', { id: toastId });
      const authState = useAuthStore.getState();
      navigate(authState.user?.role === 'cashier' ? '/cashier' : '/admin');
    } else {
      toast.error('نام کاربری یا رمز عبور اشتباه است', { id: toastId });
      setError('نام کاربری یا رمز عبور اشتباه است');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-zinc-950">
      {/* Left Side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0">
          <div className="absolute top-20 -right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        </div>
        <div className="relative text-center text-white max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <div className="w-28 h-28 bg-white/15 backdrop-blur-sm rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-white/20">
              <img className="rounded-3xl" src={logoIcon} alt="COOL Café" />
            </div>
            <h2 className="text-5xl font-black mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>COOL</h2>
            <p className="text-white/60 text-lg leading-relaxed">
              سیستم مدیریت هوشمند کافه
            </p>
            <div className="mt-8 flex items-center justify-center gap-6 text-white/40 text-sm">
              <span>مدیریت منو</span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
              <span>سفارش آنلاین</span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
              <span>گزارش‌گیری</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="w-20 h-20 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-brand-500/30">
              <Coffee className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100">کافه COOL</h1>
          </div>

          <div className="hidden lg:block mb-10">
            <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100">خوش آمدید! 👋</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">وارد پنل مدیریت شوید</p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <Banner variant="danger">{error}</Banner>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">نام کاربری</label>
              <div className="relative">
                <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="username" className="w-full pr-12 pl-4 py-4 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-base" required />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">رمز عبور</label>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="•••" className="w-full pr-12 pl-14 py-4 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-base" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full !py-4 !text-base !font-black !rounded-2xl !bg-brand-600 hover:!bg-brand-700 !shadow-xl !shadow-brand-500/25" size="lg" loading={loading}>
              ورود به پنل
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
