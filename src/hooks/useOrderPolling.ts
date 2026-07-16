import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useAppStore } from '@/store';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * هر intervalMs میلی‌ثانیه لیست سفارشات رو refresh می‌کنه.
 * اگه سفارش جدیدی باشه، یه نوتیفیکیشن پایدار نمایش می‌ده که:
 * - تا کلیک کاربر روش می‌مونه (duration: Infinity)
 * - یا تا رفتن به صفحه سفارشات بسته میشه
 * در هر صفحه‌ای از پنل (مدیر/صندوقدار) کار می‌کنه چون در Layout قرار داره.
 */
export function useOrderPolling(intervalMs = 12_000) {
  const fetchOrders  = useAppStore(s => s.fetchOrders);
  const timer        = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCount    = useRef<number | null>(null);
  const toastIds     = useRef<(string | number)[]>([]);
  const navigate     = useNavigate();
  const location     = useLocation();

  // صفحات سفارش — اگه کاربر اینجا باشه نوتیف نشون نده
  const isOrdersPage = /\/(orders|cashier)/.test(location.pathname);

  // وقتی کاربر به صفحه سفارشات رفت، توست‌های باقی‌مانده رو ببند
  useEffect(() => {
    if (isOrdersPage) {
      toastIds.current.forEach(id => toast.dismiss(id));
      toastIds.current = [];
    }
  }, [isOrdersPage]);

  const poll = useCallback(async () => {
    if (document.visibilityState === 'hidden') return;
    try {
      await fetchOrders();
      const current = useAppStore.getState().orders?.length ?? 0;
      if (lastCount.current !== null && current > lastCount.current) {
        const diff = current - lastCount.current;
        const isOrdersPageNow = /\/(orders|cashier)/.test(window.location.pathname);
        if (!isOrdersPageNow) {
          const id = toast.info(
            `${diff} سفارش جدید دریافت شد 🔔`,
            {
              duration: Infinity,
              action: {
                label: 'مشاهده سفارشات',
                onClick: () => {
                  // detect panel from path
                  const isCashier = window.location.pathname.startsWith('/cashier');
                  navigate(isCashier ? '/cashier/orders' : '/admin/orders');
                  toast.dismiss(id);
                },
              },
              onDismiss: () => {
                toastIds.current = toastIds.current.filter(t => t !== id);
              },
            }
          );
          toastIds.current.push(id);
        }
      }
      lastCount.current = current;
    } catch { /* شبکه در دسترس نیست */ }
  }, [fetchOrders, navigate]);

  useEffect(() => {
    lastCount.current = useAppStore.getState().orders?.length ?? null;

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
      // پاک کردن toast ها وقتی component unmount میشه
      toastIds.current.forEach(id => toast.dismiss(id));
    };
  }, [poll, intervalMs]);
}
