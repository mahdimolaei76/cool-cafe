import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useAppStore } from '@/store';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * هر intervalMs میلی‌ثانیه لیست سفارشات رو refresh می‌کنه.
 * سفارشات جدید با نوتیفیکیشن صوتی + بصری (toast پایدار) اطلاع داده میشه.
 * در هر صفحه‌ای از پنل (مدیر/صندوقدار) کار می‌کنه چون در Layout قرار داره.
 */
export function useOrderPolling(intervalMs = 10_000) {
  const fetchOrders  = useAppStore(s => s.fetchOrders);
  const timer        = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastOrderIds = useRef<Set<string> | null>(null);
  const toastIds     = useRef<(string | number)[]>([]);
  const navigate     = useNavigate();
  const location     = useLocation();

  // صفحات سفارش — اگه کاربر اینجا باشه نوتیف نشون نده
  const isOrdersPage = /\/(orders|cashier\/orders)/.test(location.pathname);

  // وقتی کاربر به صفحه سفارشات رفت، توست‌های باقی‌مانده رو ببند
  useEffect(() => {
    if (isOrdersPage) {
      toastIds.current.forEach(id => toast.dismiss(id));
      toastIds.current = [];
    }
  }, [isOrdersPage]);

  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
    } catch { /* مرورگر بدون Web Audio */ }
  }, []);

  const poll = useCallback(async () => {
    if (document.visibilityState === 'hidden') return;
    try {
      await fetchOrders();
      const currentOrders = useAppStore.getState().orders ?? [];
      const currentIds = new Set(currentOrders.map(o => o.id));

      if (lastOrderIds.current !== null) {
        // سفارشات جدیدی که قبلاً نبودن
        const newOrders = currentOrders.filter(o => !lastOrderIds.current!.has(o.id));

        if (newOrders.length > 0) {
          const isOrdersPageNow = /\/(orders|cashier\/orders)/.test(window.location.pathname);
          if (!isOrdersPageNow) {
            // پخش صدای نوتیفیکیشن
            playNotificationSound();

            const count = newOrders.length;
            const label = count === 1
              ? `سفارش جدید: میز ${newOrders[0].tableNumber || '—'}`
              : `${count} سفارش جدید دریافت شد`;

            const id = toast(label, {
              duration: Infinity,
              icon: '🔔',
              style: {
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                color: '#fff',
                border: 'none',
                fontWeight: 'bold',
              },
              action: {
                label: '👁 مشاهده',
                onClick: () => {
                  const isCashier = window.location.pathname.startsWith('/cashier');
                  navigate(isCashier ? '/cashier/orders' : '/admin/orders');
                  toast.dismiss(id);
                },
              },
              onDismiss: () => {
                toastIds.current = toastIds.current.filter(t => t !== id);
              },
            });
            toastIds.current.push(id);
          }
        }
      }

      lastOrderIds.current = currentIds;
    } catch { /* شبکه در دسترس نیست */ }
  }, [fetchOrders, navigate, playNotificationSound]);

  useEffect(() => {
    // مقداردهی اولیه با IDs فعلی بدون نوتیف
    const initial = useAppStore.getState().orders ?? [];
    lastOrderIds.current = new Set(initial.map(o => o.id));

    const start = () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(poll, intervalMs);
    };
    const stop = () => { if (timer.current) clearInterval(timer.current); };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') { poll(); start(); }
      else stop();
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      toastIds.current.forEach(id => toast.dismiss(id));
    };
  }, [poll, intervalMs]);
}
