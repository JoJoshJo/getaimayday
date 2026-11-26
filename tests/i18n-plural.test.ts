/** Session 12: plurals with Intl.PluralRules ("1 cochées" bug on the open incident card). */
import { describe, expect, it } from 'vitest'
import { format, messages, pluralCategory } from '../src/i18n/messages'

const t = (lang: 'en' | 'fr', key: keyof typeof messages.en, vars: Record<string, string | number>) => format(messages[lang][key], vars, lang)

describe('plural token {n|one|other}', () => {
  it('French: 0 and 1 are singular, 2 is plural', () => {
    expect(t('fr', 'plan.progressShort', { done: 0 })).toBe('0 cochée')
    expect(t('fr', 'plan.progressShort', { done: 1 })).toBe('1 cochée')
    expect(t('fr', 'plan.progressShort', { done: 2 })).toBe('2 cochées')
  })
  it('English: only 1 is singular', () => {
    expect(t('en', 'pack.counts', { en: 0, fr: 3 })).toBe('0 answers in English, 3 in French.')
    expect(t('en', 'pack.counts', { en: 1, fr: 3 })).toBe('1 answer in English, 3 in French.')
    expect(t('en', 'pack.counts', { en: 2, fr: 3 })).toBe('2 answers in English, 3 in French.')
  })
  it('the other French counters', () => {
    expect(t('fr', 'pack.job.done', { n: '1' })).toBe('1 enregistrée')
    expect(t('fr', 'pack.job.done', { n: '24' })).toBe('24 enregistrées')
    expect(t('fr', 'pack.job.dropped', { n: '0' })).toBe('0 écartée par le contrôle de sécurité')
    expect(t('fr', 'pack.counts', { en: 1, fr: 1 })).toBe('1 réponse en anglais, 1 en français.')
  })
  it('PluralRules categories', () => {
    expect([0, 1, 2].map((n) => pluralCategory('fr', n))).toEqual(['one', 'one', 'other'])
    expect([0, 1, 2].map((n) => pluralCategory('en', n))).toEqual(['other', 'one', 'other'])
  })
  it('every plural token in EN and FR names a placeholder the message also uses', () => {
    for (const lang of ['en', 'fr'] as const)
      for (const [k, v] of Object.entries(messages[lang]))
        for (const m of v.matchAll(/\{(\w+)\|[^|{}]*\|[^|{}]*\}/g)) expect(v.includes(`{${m[1]}}`), `${lang}:${k}`).toBe(true)
  })
  it('no FR counter left with a fixed plural after a bare count at the start', () => {
    // "{n} enregistrées" style: a count followed by a plural-only word, with no token.
    // pack.failedParts is only shown for 2 or more (PackScreen uses pack.failedPart for 1).
    const ONLY_PLURAL = new Set(['pack.failedParts'])
    const bad = Object.entries(messages.fr).filter(([k, v]) => !ONLY_PLURAL.has(k) && /^\{(n|done|en|count)\} [a-zéèêàç]+(es|s)\b/.test(v))
    expect(bad.map(([k]) => k)).toEqual([])
  })
})
