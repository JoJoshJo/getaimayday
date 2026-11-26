/**
 * "Ask a question" on a plan step (MUST, Session 4 #7). Order:
 *   1. On-device AI (Gemini Nano via AI Logic, ONLY_ON_DEVICE), only when Chrome
 *      says the model is "available"; bound to the step + a short plan summary.
 *   2. Offline Pack (MiniSearch, no model), limited to this plan (a fix-it searches
 *      its related incident plan, or skips the Pack when it has none).
 *   3. Nothing → "call your contact" (badge Checklist).
 * Never cloud: this runs on incident day.
 */
import type { Routed } from '../../ai/router'
import type { AskResult } from '../../ai/schemas'
import { askPrompt, type AskGuide } from '../../ai/prompts/ask'
import { isUnsafeAdvice, plainText } from '../../pack/guard'
import { buildIndex, matchPack, type PackMatch } from '../../pack/match'
import type { Pack, PackLang } from '../../pack/schema'
import type { PlanStep } from '../../plans/schema'

export type AskAnswer =
  | { kind: 'ai'; source: 'on-device'; text: string }
  | { kind: 'pack'; match: PackMatch }
  | { kind: 'none'; reason: 'no-pack' | 'no-answer' | 'no-ai' }

export type AskDeps = {
  availability: () => Promise<string>
  ask: (prompt: string) => Promise<Routed<AskResult | null>>
  loadPack: () => Promise<Pack | null>
}

export async function answerQuestion(question: string, plan: AskGuide, step: PlanStep, lang: PackLang, deps: AskDeps): Promise<AskAnswer> {
  if ((await deps.availability()) === 'available') {
    const r = await deps.ask(askPrompt(plan, step, question, lang))
    const text = r.data ? plainText(r.data.answer) : ''
    if (r.source === 'on-device' && r.data?.in_plan && text && !isUnsafeAdvice(text)) return { kind: 'ai', source: 'on-device', text }
  }
  const planId = plan.packPlan === undefined ? plan.id : plan.packPlan
  if (planId === null) return { kind: 'none', reason: 'no-ai' }
  const pack = await deps.loadPack()
  if (!pack) return { kind: 'none', reason: 'no-pack' }
  const match = matchPack(buildIndex(pack, lang), question, { planId })
  return match.top.length ? { kind: 'pack', match } : { kind: 'none', reason: 'no-answer' }
}
