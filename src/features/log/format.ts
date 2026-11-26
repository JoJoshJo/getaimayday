import type { Lang } from '../../i18n/messages'

export const fmtTime = (lang: Lang, ms: number) => new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' }).format(ms)
export const fmtDateTime = (lang: Lang, ms: number) =>
  new Intl.DateTimeFormat(lang, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(ms)

/** On-device image input supports PNG and JPEG only (Firebase hybrid docs). */
export const PHOTO_TYPES = ['image/png', 'image/jpeg']
