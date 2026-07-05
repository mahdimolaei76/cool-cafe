import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronLeft, Calendar } from 'lucide-react';
import { cn } from '@/utils/cn';
import { toJalali, toGregorian, toPersianDigits, PERSIAN_MONTHS, PERSIAN_WEEKDAYS_SHORT } from '@/utils/jalali';

interface JalaliDatePickerProps {
  label?: string;
  /** Value as an ISO date string (YYYY-MM-DD), matching the native <input type="date"> contract used elsewhere in the app. */
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  className?: string;
}

function daysInJalaliMonth(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  // Esfand: 29 or 30 in a leap year. Rather than re-deriving leap-year
  // rules, ask the converter itself by checking whether day 30 round-trips.
  const gDate = toGregorian(jy, 12, 30);
  return toJalali(gDate).jm === 12 && toJalali(gDate).jd === 30 ? 30 : 29;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * A fully Jalali (Persian/Shamsi) date picker. Internally it still exchanges
 * plain ISO (Gregorian) date strings with the rest of the app — exactly
 * what the native `<input type="date">` it replaces used — so filters,
 * reports, and API calls need no changes. Only the picker UI itself is
 * Persian: month grid, month/year navigation, and weekday headers.
 */
export default function JalaliDatePicker({ label, value, onChange, placeholder, className }: JalaliDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(0);
  const [viewMonth, setViewMonth] = useState(0);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const selected = value ? new Date(`${value}T00:00:00`) : null;
  const selectedJalali = selected && !Number.isNaN(selected.getTime()) ? toJalali(selected) : null;

  useEffect(() => {
    const base = selectedJalali ?? toJalali(new Date());
    setViewYear(base.jy);
    setViewMonth(base.jm);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const popoverWidth = Math.max(rect.width, 280);
      // Clamp left so the popover never runs off either edge of the
      // viewport, which matters most on narrow phone screens.
      const maxLeft = window.innerWidth - popoverWidth - 8;
      const clampedLeft = Math.min(Math.max(rect.left, 8), Math.max(maxLeft, 8));
      setCoords({ top: rect.bottom + 8, left: clampedLeft, width: rect.width });
    };
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    const handleClickOutside = (e: MouseEvent) => {
      if (
        anchorRef.current && !anchorRef.current.contains(e.target as Node) &&
        popoverRef.current && !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const goToPrevMonth = () => {
    if (viewMonth === 1) { setViewYear((y: number) => y - 1); setViewMonth(12); }
    else setViewMonth((m: number) => m - 1);
  };
  const goToNextMonth = () => {
    if (viewMonth === 12) { setViewYear((y: number) => y + 1); setViewMonth(1); }
    else setViewMonth((m: number) => m + 1);
  };

  const handleSelectDay = (jd: number) => {
    const gDate = toGregorian(viewYear, viewMonth, jd);
    onChange(toIsoDate(gDate));
    setOpen(false);
  };

  const totalDays = daysInJalaliMonth(viewYear, viewMonth);
  const firstOfMonthGregorian = toGregorian(viewYear, viewMonth, 1);
  // JS getDay(): 0=Sunday..6=Saturday. Our week header starts Saturday
  // (شنبه) per the Persian week, so shift by one.
  const leadingBlanks = (firstOfMonthGregorian.getDay() + 1) % 7;

  const displayText = selectedJalali
    ? `${toPersianDigits(selectedJalali.jy)}/${toPersianDigits(String(selectedJalali.jm).padStart(2, '0'))}/${toPersianDigits(String(selectedJalali.jd).padStart(2, '0'))}`
    : '';

  const todayJalali = toJalali(new Date());

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{label}</label>}
      <div ref={anchorRef}>
        <button
          type="button"
          onClick={() => setOpen((o: boolean) => !o)}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 transition-colors text-right"
        >
          <Calendar className="w-4 h-4 text-zinc-400 flex-shrink-0" />
          <span className={cn('flex-1', !displayText && 'text-zinc-400')}>{displayText || placeholder || 'انتخاب تاریخ'}</span>
        </button>
      </div>

      {open && createPortal(
        <div
          ref={popoverRef}
          style={{ position: 'fixed', top: coords.top, left: coords.left, minWidth: Math.max(coords.width, 280) }}
          className="z-[1000] bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-2xl p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={goToNextMonth} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              {PERSIAN_MONTHS[viewMonth - 1]} {toPersianDigits(viewYear)}
            </p>
            <button type="button" onClick={goToPrevMonth} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {PERSIAN_WEEKDAYS_SHORT.slice(1).concat(PERSIAN_WEEKDAYS_SHORT[0]).map((d: string, i: number) => (
              <div key={i} className="text-center text-[10px] font-bold text-zinc-400 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`b${i}`} />)}
            {Array.from({ length: totalDays }).map((_, i) => {
              const jd = i + 1;
              const isSelected = selectedJalali?.jy === viewYear && selectedJalali?.jm === viewMonth && selectedJalali?.jd === jd;
              const isToday = todayJalali.jy === viewYear && todayJalali.jm === viewMonth && todayJalali.jd === jd;
              return (
                <button
                  key={jd}
                  type="button"
                  onClick={() => handleSelectDay(jd)}
                  className={cn(
                    'aspect-square rounded-lg text-xs font-medium flex items-center justify-center transition-colors',
                    isSelected
                      ? 'bg-brand-600 text-white font-bold'
                      : isToday
                        ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 font-bold'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  )}
                >
                  {toPersianDigits(jd)}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => { onChange(toIsoDate(new Date())); setOpen(false); }}
            className="w-full mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-700 text-xs font-bold text-brand-600 hover:text-brand-700"
          >
            امروز
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
