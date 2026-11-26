/**
 * "Ask a question" on a plan step (MUST, Session 4 #7). Order:
 *   1. On-device AI (Gemini Nano via AI Logic, ONLY_ON_DEVICE), only when Chrome
 *      says the model is "available"; bound to the step + a short plan summary.
 *   2. Offline Pack (MiniSearch, no model), limited to this plan (a fix-it searches
 *      its related incident plan, or skips the Pack when it has none).
 *   3. Nothing → "call your contact" (badge Checklist).
 * Incident plans never use the cloud: this runs on incident day.
 *
 * Everyday IT fix-its (no incident, no business data) use PREFER_ON_DEVICE instead
 * (Session 8, see src/ai/modes.ts): Nano when Chrome has it, otherwise the SDK sends
 * the question to cloud Gemini by itself. That needs the internet; offline with no
 * Nano, the call is skipped and the fallback above runs. Emails and phone numbers
 * are removed from the question first, and the badge shows the SDK's real source.
 */
import type { InferenceMode } from 'firebase/ai'
import { askMode, mayAutoCloud } from '../../ai/modes'
import type { Routed } from '../../ai/router'
import type { AskResult } from '../../ai/schemas'
import { askPrompt, type AskGuide } from '../../ai/prompts/ask'
import { isUnsafeAdvice, plainText } from '../../pack/guard'
import { buildIndex, matchPack, type PackMatch } from '../../pack/match'
import type { Pack, PackLang } from '../../pack/schema'
import type { PlanStep } from '../../plans/schema'
import { scrubPersonal } from './scrub'

export type AskAnswer =
  | { kind: 'ai'; source: 'on-device' | 'cloud'; text: string }
  | { kind: 'pack'; match: PackMatch }
  | { kind: 'none'; reason: 'no-pack' | 'no-answer' | 'no-ai' }

export type AskDeps = {
  availability: () => Promise<string>
  ask: (prompt: string, mode: InferenceMode) => Promise<Routed<AskResult | null>>
  loadPack: () => Promise<Pack | null>
  /** navigator.onLine in the app. Only read for fix-its (cloud fallback). */
  online: () => boolean
}

export async function answerQuestion(question: string, plan: AskGuide, step: PlanStep, lang: PackLang, deps: AskDeps): Promise<AskAnswer> {
  const mode = askMode(plan)
  const auto = mayAutoCloud(mode)
  const nano = (await deps.availability()) === 'available'
  if (nano || (auto && deps.online())) {
    const r = await deps.ask(askPrompt(plan, step, auto ? scrubPersonal(question, lang) : question, lang), mode)
    const text = r.data ? plainText(r.data.answer) : ''
    const source = r.source === 'on-device' || (auto && r.source === 'cloud') ? r.source : null
    if (source && r.data?.in_plan && text && !isUnsafeAdvice(text)) return { kind: 'ai', source, text }
  }
  const planId = plan.packPlan === undefined ? plan.id : plan.packPlan
  if (planId === null) return { kind: 'none', reason: 'no-ai' }
  const pack = await deps.loadPack()
  if (!pack) return { kind: 'none', reason: 'no-pack' }
  const match = matchPack(buildIndex(pack, lang), question, { planId })
  return match.top.length ? { kind: 'pack', match } : { kind: 'none', reason: 'no-answer' }
}
