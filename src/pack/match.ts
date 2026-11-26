/**
 * Offline Pack search (MASTER §7): plain full-text search with MiniSearch.
 * NOT an AI model. Works with no network and no on-device AI.
 *
 *   confident → the top answer, badge "Offline Pack"
 *   not sure  → the 3 closest questions + "call your IT contact"
 *
 * Confidence = share of the meaningful words in the question that the top
 * result matched (stop words removed, accents ignored, small typos allowed).
 */
import MiniSearch from 'minisearch'
import type { Pack, PackLang, PackQa } from './schema'

const STOP = new Set(
  (
    'a an the and or but if of to in on at for from by with is are was were be been am do does did i me my we our us you your it its this that these those what which who how when where why can could should would will shall may might must have has had not no so as about there here just now any some get got ' +
    'le la les un une des du de d l et ou mais si a au aux en dans sur pour par avec est sont etait etre je j me m mon ma mes nous notre nos vous votre vos il elle ils elles on ce c cet cette ces qui que qu quoi comment quand ou pourquoi peut peux dois doit faut ai as avons avez ont ne n pas plus y se s sa son ses leur leurs tout tous'
  ).split(' '),
)

/** Lowercase, strip accents, drop stop words (used for indexing AND for queries). */
export function normalizeTerm(term: string): string | null {
  const t = term
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
  return t.length > 1 && !STOP.has(t) ? t : null
}

type Doc = { id: string; plan_id: string; question: string; alt: string; answer: string }

export type PackIndex = { lang: PackLang; search: MiniSearch<Doc>; byId: Map<string, PackQa & { plan_id: string }> }

export function buildIndex(pack: Pack, lang: PackLang): PackIndex {
  const search = new MiniSearch<Doc>({
    fields: ['question', 'alt', 'answer'],
    storeFields: ['plan_id'],
    processTerm: (t) => normalizeTerm(t),
    searchOptions: { boost: { question: 3, alt: 2, answer: 0.5 }, fuzzy: 0.2, prefix: (t) => t.length > 3, combineWith: 'OR' },
  })
  const byId = new Map<string, PackQa & { plan_id: string }>()
  for (const chunk of Object.values(pack.chunks)) {
    if (chunk.kind !== 'plan' || chunk.lang !== lang) continue
    for (const q of chunk.qa) {
      byId.set(q.id, { ...q, plan_id: chunk.plan_id })
      search.add({ id: q.id, plan_id: chunk.plan_id, question: q.question, alt: q.alt_phrasings.join(' \n '), answer: q.answer })
    }
  }
  return { lang, search, byId }
}

export type PackHit = PackQa & { plan_id: string; score: number }
export type PackMatch = { confident: boolean; top: PackHit[] }

/** Threshold: the top result must match at least this share of the question's words. */
export const MIN_COVERAGE = 0.6

export function matchPack(index: PackIndex, question: string, opts: { planId?: string } = {}): PackMatch {
  const qTerms = new Set(
    question
      .split(/[\s\p{P}]+/u)
      .map(normalizeTerm)
      .filter((t): t is string => !!t),
  )
  if (!qTerms.size) return { confident: false, top: [] }
  const filter = opts.planId ? (r: { plan_id: string }) => r.plan_id === opts.planId : undefined
  const results = index.search.search(question, filter ? { filter: filter as never } : undefined)
  const top = results.slice(0, 3).map((r) => ({ ...index.byId.get(String(r.id))!, score: r.score }))
  if (!top.length) return { confident: false, top }
  const matched = new Set(results[0].queryTerms.map(normalizeTerm).filter(Boolean)).size
  const coverage = matched / qTerms.size
  const confident = coverage >= MIN_COVERAGE && matched >= Math.min(2, qTerms.size)
  return { confident, top: confident ? top.slice(0, 1) : top }
}

/** Number of answers per language, for status lines. */
export function countAnswers(pack: Pack | null, lang: PackLang): number {
  if (!pack) return 0
  return Object.values(pack.chunks).reduce((n, c) => n + (c.kind === 'plan' && c.lang === lang ? c.qa.length : 0), 0)
}
