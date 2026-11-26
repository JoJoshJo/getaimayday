/**
 * Offline Pack builder (MASTER §7). Pure logic: the cloud call is injected
 * (`generate`), so tests run without Firebase. The real `generate` is
 * src/ai/cloud.ts (Firebase AI Logic, ONLY_IN_CLOUD).
 *
 *   packJobs()   → one job per chunk, with the EXACT prompt that will be sent
 *                  (the preview screen shows these before anything leaves)
 *   runPackJob() → calls the model, validates with zod, keeps only items that
 *                  point at a real plan step, copies the source from that step,
 *                  drops unsafe advice, returns a chunk ready to store
 */
import { glossaryPrompt as gPrompt, planChunkPrompt } from '../ai/prompts/pack'
import { CONTACT_ROLES, hasContact, type Contacts, type Profile } from '../features/setup/model'
import { rawPlans } from '../plans'
import type { Plan } from '../plans/schema'
import { isUnsafeAdvice, plainText } from './guard'
import { chunkKey, glossaryJsonSchema, ModelGlossarySchema, ModelPlanChunkSchema, PACK_LANGS, planChunkJsonSchema, type Chunk, type PackLang } from './schema'

export type PackJob =
  | { key: string; kind: 'plan'; lang: PackLang; plan: Plan; prompt: string; jsonSchema: object }
  | { key: string; kind: 'glossary'; lang: PackLang; prompt: string; jsonSchema: object }

/** What a cloud call returns. `inferenceSource` must be "in_cloud" or the chunk is rejected. */
export type Generate = (prompt: string, jsonSchema: object) => Promise<{ text: string; inferenceSource: string | undefined; model: string }>

const TYPE_WORDS: Record<Profile['type'], string> = {
  health: 'health or dental office',
  retail: 'shop',
  food: 'restaurant or cafe',
  office: 'office or services',
  trades: 'trades or construction',
  other: 'other',
}
const COUNTRY_WORDS: Record<Profile['country'], string> = { US: 'United States', CA: 'Canada', FR: 'France', other: 'other' }

/**
 * The business context sent to the cloud. NOT sent: business name, city,
 * contact names, phone numbers, emails, notes, incidents, photos.
 */
export function businessContext(p: Profile, c: Contacts): string {
  const roles = CONTACT_ROLES.filter((r) => hasContact(c[r]))
  const line = (k: string, v: string) => (v.trim() ? `${k}: ${v.trim()}\n` : '')
  return (
    line('Type of business', TYPE_WORDS[p.type]) +
    line('Country', COUNTRY_WORDS[p.country]) +
    line('Number of staff', p.staff) +
    line('Email provider', p.email_provider) +
    line('Important systems', p.key_systems) +
    line('Backups', p.backups === 'yes' ? 'yes' : p.backups === 'no' ? 'no' : 'not sure') +
    line('Where backups are', p.backups_where) +
    `Contacts they have on file (roles only): ${roles.length ? roles.join(', ') : 'none yet'}`
  ).trim()
}

export function planIds(): string[] {
  return Object.keys(rawPlans.en ?? {}).sort()
}

export function packJobs(p: Profile, c: Contacts, langs: readonly PackLang[] = PACK_LANGS): PackJob[] {
  const ctx = businessContext(p, c)
  const jobs: PackJob[] = []
  for (const lang of langs) {
    for (const id of planIds()) {
      const plan = rawPlans[lang]?.[id] as Plan | undefined
      if (!plan) continue
      jobs.push({ key: chunkKey(lang, id), kind: 'plan', lang, plan, prompt: planChunkPrompt(plan, lang, ctx), jsonSchema: planChunkJsonSchema(plan.steps.map((s) => s.id)) })
    }
    jobs.push({ key: chunkKey(lang, 'glossary'), kind: 'glossary', lang, prompt: gPrompt(lang, ctx), jsonSchema: glossaryJsonSchema })
  }
  return jobs
}

/** Short stable hash of what the Pack was built from (profile context + plan versions). */
export function packInputHash(p: Profile, c: Contacts): string {
  const s = businessContext(p, c) + '|' + planIds().map((id) => `${id}@${(rawPlans.en[id] as Plan).version}`).join(',')
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

export type JobOutcome = { chunk: Chunk; dropped: number }

export async function runPackJob(job: PackJob, generate: Generate, now: () => number = Date.now): Promise<JobOutcome> {
  const r = await generate(job.prompt, job.jsonSchema)
  if (r.inferenceSource !== 'in_cloud') throw new Error(`Pack chunk did not come from cloud AI (got ${JSON.stringify(r.inferenceSource)})`)
  const json: unknown = JSON.parse(r.text)

  if (job.kind === 'glossary') {
    const g = ModelGlossarySchema.parse(json)
    const terms = g.terms.map((t) => ({ term: plainText(t.term), plain: plainText(t.plain) })).filter((t) => !isUnsafeAdvice(t.plain))
    return { chunk: { kind: 'glossary', lang: job.lang, generated_at: now(), model: r.model, terms }, dropped: g.terms.length - terms.length }
  }

  const m = ModelPlanChunkSchema.parse(json)
  const steps = new Map(job.plan.steps.map((s) => [s.id, s]))
  const qa = []
  let dropped = 0
  for (const [i, item] of m.qa.entries()) {
    const step = steps.get(item.step_ref)
    const answer = plainText(item.answer)
    if (!step || isUnsafeAdvice(answer)) {
      dropped++
      continue
    }
    qa.push({
      id: `${job.key}:${i}`,
      question: plainText(item.question),
      alt_phrasings: item.alt_phrasings.map(plainText).filter(Boolean),
      answer,
      step_ref: step.id,
      contact_role: item.contact_role === 'none' ? null : item.contact_role,
      // Always the plan's own source: the model never supplies links.
      source_name: step.source_name,
      source_url: step.source_url,
    })
  }
  if (!qa.length) throw new Error('Pack chunk had no usable answers')
  return { chunk: { kind: 'plan', plan_id: job.plan.id, plan_version: job.plan.version, lang: job.lang, generated_at: now(), model: r.model, qa }, dropped }
}
