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
import { keywordMatch } from '../features/home/keywords'
import { planIdFor } from '../plans/incidents'
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

/**
 * Without a plan (the #/pack search box), when the incident keywords clearly
 * point to one plan (same matcher as "Something's wrong" on Home; a tie gives
 * no hint), that plan's matches are ranked first. "should we pay the ransom" is
 * a ransomware question even if a lost-device answer says "pay a ransom" in
 * both its question and phrasings (live bug, Session 7). A score multiplier was
 * tried first (×3): not enough, because BM25 favours the look-alike that
 * matches both words. Other plans' answers still follow, so nothing is hidden.
 */

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
  // Plan-scoped search (a plan step) is unchanged: filter only, no boost.
  const hinted = opts.planId ? null : keywordMatch(question)
  const hintPlan = hinted ? planIdFor(hinted.incident) : null
  const raw = index.search.search(question, filter ? { filter: filter as never } : undefined)
  let results = raw
  if (hinted && hintPlan) {
    // Inside the hinted plan, the incident word ("ransom") is in almost every answer, so the
    // OTHER words ("pay") decide: more of them matched first, then the usual score.
    const others = (r: (typeof raw)[number]) => new Set(r.queryTerms.filter((t) => keywordMatch(t)?.incident !== hinted.incident)).size
    const inPlan = raw.filter((r) => r.plan_id === hintPlan).sort((a, b) => others(b) - others(a) || b.score - a.score)
    results = [...inPlan, ...raw.filter((r) => r.plan_id !== hintPlan)]
  }
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
