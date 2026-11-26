import en from './en.json'
import fr from './fr.json'

export const LANGUAGES = ['en', 'fr'] as const
export type Lang = (typeof LANGUAGES)[number]
export const DEFAULT_LANG: Lang = 'en'

export type MessageKey = keyof typeof en
export const messages: Record<Lang, Record<MessageKey, string>> = { en, fr }

const pluralRules = new Map<Lang, Intl.PluralRules>()
/** "one" or "other" for this count in this language (French: 0 and 1 are "one"). */
export function pluralCategory(lang: Lang, n: number): 'one' | 'other' {
  let r = pluralRules.get(lang)
  if (!r) pluralRules.set(lang, (r = new Intl.PluralRules(lang)))
  return r.select(n) === 'one' ? 'one' : 'other'
}

/**
 * Replace {name} placeholders. Session 12: a plural token {name|one|other} picks the
 * word for that count with Intl.PluralRules ("{done} {done|cochée|cochées}" →
 * FR "0 cochée", "1 cochée", "2 cochées"; EN "{n} {n|answer|answers}").
 */
export function format(template: string, vars?: Record<string, string | number>, lang: Lang = DEFAULT_LANG): string {
  if (!vars) return template
  return template
    .replace(/\{(\w+)\|([^|{}]*)\|([^|{}]*)\}/g, (m, k: string, one: string, other: string) => {
      const n = Number(vars[k])
      return k in vars && Number.isFinite(n) ? (pluralCategory(lang, n) === 'one' ? one : other) : m
    })
    .replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}
