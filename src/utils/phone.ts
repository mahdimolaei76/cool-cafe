/**
 * Iranian mobile phone number validation.
 *
 * Accepts the three common formats customers/staff might type:
 *   09123456789     (local, 11 digits starting with 0)
 *   989123456789    (country code without +)
 *   +989123456789   (country code with +)
 *
 * Persian digits (۰۹۱۲...) are also accepted and normalized.
 */

/** Convert Persian/Arabic-indic digits in a string to ASCII digits. */
function toAsciiDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

const IRAN_MOBILE_REGEX = /^(?:0|98|\+98)9\d{9}$/;

/** True if `value` is a valid Iranian mobile number in any accepted format. */
export function isValidIranianMobile(value: string): boolean {
  if (!value) return false;
  const normalized = toAsciiDigits(value).replace(/[\s-]/g, '');
  return IRAN_MOBILE_REGEX.test(normalized);
}

/** Normalize any accepted format to the canonical local form: 09XXXXXXXXX. */
export function normalizeIranianMobile(value: string): string {
  const normalized = toAsciiDigits(value).replace(/[\s-]/g, '');
  if (!IRAN_MOBILE_REGEX.test(normalized)) return normalized;
  const digits = normalized.replace(/^\+?98/, '0').replace(/^98/, '0');
  return digits.startsWith('0') ? digits : `0${digits}`;
}

/** User-friendly Persian validation message, or '' if valid/empty. */
export function iranianMobileError(value: string, required = false): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return required ? 'شماره تماس الزامی است' : '';
  if (!isValidIranianMobile(trimmed)) {
    return 'شماره موبایل معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹)';
  }
  return '';
}
