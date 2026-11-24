import en from './en.json'
import fr from './fr.json'

export const LANGUAGES = ['en', 'fr'] as const
export type Lang = (typeof LANGUAGES)[number]
export const DEFAULT_LANG: Lang = 'en'

export type MessageKey = keyof typeof en
export const messages: Record<Lang, Record<MessageKey, string>> = { en, fr }

/** Replace {name} placeholders. */
export function format(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}
