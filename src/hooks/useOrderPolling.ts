import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useAppStore } from '@/store';

/**
 * هر intervalMs میلی‌ثانیه یک‌بار لیست سفارشات را بروزرسانی می‌کند.
 * اگر سفارش جدیدی برسد، یک toast نمایش داده می‌شود.
 * در تب پنهان poll متوقف می‌شود و با برگشت فوری اجرا می‌شود.
 */
export function useOrderPolling(intervalMs = 15_000) {
  const fetchOrders = useAppStore(s => s.fetchOrders);
  const timer       = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCount   = useRef<number | null>(null);

  const poll = useCallback(async () => {
    if (document.visibilityState === 'hidden') return;
    try {
      await fetchOrders();
      const current = useAppStore.getState().orders?.length ?? 0;
      if (lastCount.current !== null && current > lastCount.current) {
        const diff = current - lastCount.current;
        toast.info(`${diff} سفارش جدید دریافت شد 🔔`, { duration: 6000 });
      }
      lastCount.current = current;
    } catch { /* شبکه در دسترس نیست — بی‌صدا رد شو */ }
  }, [fetchOrders]);

  useEffect(() => {
    // مقدار اولیه را ثبت می‌کنیم (قبل از اولین poll)
    const init = useAppStore.getState().orders?.length ?? null;
    lastCount.current = init;

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
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [poll, intervalMs]);
}
