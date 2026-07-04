/**
 * Jalali (Persian) calendar utilities.
 *
 * All internal storage (API payloads, database columns, the zustand store)
 * stays in Gregorian ISO-8601 exactly as before — only *display* is
 * converted to Jalali. This keeps sorting, date-math, and API contracts
 * unambiguous while showing users Persian dates everywhere in the UI.
 *
 * The Gregorian<->Jalali conversion below is the well-known algorithm
 * behind the `jalaali-js` library (Kazimierz Borkowski / Roozbeh Pournader),
 * verified round-trip against known reference dates (e.g. Nowruz 1403 =
 * 2024-03-20).
 */

const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

const PERSIAN_WEEKDAYS = [
  'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه',
];

const PERSIAN_WEEKDAYS_SHORT = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'];

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export interface JalaliDate {
  jy: number;
  jm: number; // 1-12
  jd: number; // 1-31
}

function div(a: number, b: number): number {
  return ~~(a / b);
}
function mod(a: number, b: number): number {
  return a - ~~(a / b) * b;
}

// Years in which the 33-year cycle "breaks" — part of the reference algorithm.
const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

function jalCal(jy: number) {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jm = 0;
  let jump = 0;
  let n: number;
  let i: number;

  for (i = 1; i < bl; i += 1) {
    jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  n = jy - jp;

  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) n = n - jump + div(jump, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;

  return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number): number {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number): { gy: number; gm: number; gd: number } {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number): JalaliDate {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(r.gy, 3, r.march);
  let k = jdn - jdn1f;
  let jm: number;
  let jd: number;

  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31);
      jd = mod(k, 31) + 1;
      return { jy, jm, jd };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 365 + r.leap;
  }
  jm = 7 + div(k, 30);
  jd = mod(k, 30) + 1;
  return { jy, jm, jd };
}

/** Convert a Gregorian JS Date to Jalali (year, month, day). */
export function toJalali(date: Date): JalaliDate {
  const jdn = g2d(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return d2j(jdn);
}

/** Convert a Jalali date back to a Gregorian JS Date (at local midnight). */
export function toGregorian(jy: number, jm: number, jd: number): Date {
  const jdn = j2d(jy, jm, jd);
  const { gy, gm, gd } = d2g(jdn);
  return new Date(gy, gm - 1, gd);
}

/** Convert ASCII digits in a string/number to Persian digits. */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Format any parseable date (ISO string, Date, or timestamp) as a Jalali
 * date string using dayjs-like tokens: YYYY, YY, MM, M, MMMM, DD, D, dddd,
 * HH, mm, ss.
 */
export function formatJalali(input: string | number | Date, format = 'YYYY/MM/DD'): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '';

  const { jy, jm, jd } = toJalali(date);
  const weekday = PERSIAN_WEEKDAYS[date.getDay()];
  const hh = pad2(date.getHours());
  const min = pad2(date.getMinutes());
  const sec = pad2(date.getSeconds());

  return format
    .replace(/YYYY/g, toPersianDigits(jy))
    .replace(/YY/g, toPersianDigits(String(jy).slice(-2)))
    .replace(/MMMM/g, PERSIAN_MONTHS[jm - 1])
    .replace(/MM/g, toPersianDigits(pad2(jm)))
    .replace(/M(?!M)/g, toPersianDigits(jm))
    .replace(/DD/g, toPersianDigits(pad2(jd)))
    .replace(/D(?!D)/g, toPersianDigits(jd))
    .replace(/dddd/g, weekday)
    .replace(/HH/g, toPersianDigits(hh))
    .replace(/mm/g, toPersianDigits(min))
    .replace(/ss/g, toPersianDigits(sec));
}

/** "چهارشنبه، ۱۴ تیر ۱۴۰۵" style long date. */
export function formatJalaliLong(input: string | number | Date): string {
  return formatJalali(input, 'dddd، D MMMM YYYY');
}

/** "۱۴۰۵/۰۴/۱۳ - ۱۴:۳۰" style date + time. */
export function formatJalaliDateTime(input: string | number | Date): string {
  return formatJalali(input, 'YYYY/MM/DD - HH:mm');
}

/** Relative time in Persian, e.g. "۵ دقیقه پیش" / "چند لحظه پیش". */
export function fromNowFa(input: string | number | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  const future = diffSec < 0;

  if (abs < 60) return future ? 'چند لحظه دیگر' : 'چند لحظه پیش';

  let value: number;
  let label: string;
  if (abs < 3600) { value = Math.round(abs / 60); label = 'دقیقه'; }
  else if (abs < 86400) { value = Math.round(abs / 3600); label = 'ساعت'; }
  else if (abs < 2592000) { value = Math.round(abs / 86400); label = 'روز'; }
  else if (abs < 31536000) { value = Math.round(abs / 2592000); label = 'ماه'; }
  else { value = Math.round(abs / 31536000); label = 'سال'; }

  const num = toPersianDigits(value);
  return future ? `${num} ${label} دیگر` : `${num} ${label} پیش`;
}

export { PERSIAN_MONTHS, PERSIAN_WEEKDAYS, PERSIAN_WEEKDAYS_SHORT };
