/**
 * Removes obvious personal details from a fix-it question before it may go to cloud
 * AI (Session 8): email addresses and phone numbers. A safety net only: the notice
 * under the question box asks people not to type personal details.
 *
 * Kept on purpose, since they help with IT problems and are not personal:
 * error codes (0x80070005, 8 digits or fewer), dates (2026-11-26), IPv4 addresses (192.168.1.1).
 */
const EMAIL = /[^\s@<>()"',;]+@[^\s@<>()"',;]+\.\p{L}{2,}/giu
const PHONE = /(?<!\w|\d\.)\+?\(?\d[\d\s().-]{5,}\d(?!\w|\.\d)/g
const DATE = /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$|^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/

function isPhone(s: string): boolean {
  const t = s.trim()
  if (DATE.test(t) || IPV4.test(t)) return false
  const digits = t.replace(/\D/g, '').length
  if (digits < 7 || digits > 15) return false
  // A bare run of digits is a code unless it is phone length.
  return /[\s().+-]/.test(t) || digits >= 10
}

export function scrubPersonal(text: string, lang: 'en' | 'fr'): string {
  const email = lang === 'fr' ? '[adresse e-mail retirée]' : '[email removed]'
  const phone = lang === 'fr' ? '[numéro retiré]' : '[phone number removed]'
  return text.replace(EMAIL, email).replace(PHONE, (m) => (isPhone(m) ? phone : m))
}
