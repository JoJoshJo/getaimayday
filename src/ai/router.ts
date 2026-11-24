/**
 * AI router (MASTER.md §5): one function per job. Picks the inference mode and
 * returns { data, source } where `source` is the REAL origin of the answer:
 *
 *   on-device  → Gemini Nano via Firebase AI Logic (SDK inferenceSource = on_device)
 *   cloud      → Gemini via Firebase AI Logic     (SDK inferenceSource = in_cloud)
 *   pack       → Offline Incident Pack, no model   (reserved: Pack not built yet)
 *   checklist  → no AI answer; the UI falls back to tiles / manual reading
 *
 * Incident-day jobs are on-device only (no cloud), per MASTER §5:
 * Nano → Pack (later) → checklist. Nothing is ever invented: if a job fails,
 * or the SDK does not say which source ran, the result is "checklist" with
 * data = "unknown" (classify) or null (triage), plus the error for the log.
 *
 * Firebase is imported lazily so the offline shell never depends on it.
 */
import type { InferenceMode, InferenceSource } from 'firebase/ai'
import type { IncidentType, TriageResult } from './schemas'

export type Source = 'on-device' | 'cloud' | 'pack' | 'checklist'

export type Routed<T> = {
  data: T
  source: Source
  /** Wall-clock seconds for the whole job, including model/session startup. */
  seconds: number
  /** Present when the AI path failed and we fell back. */
  error?: string
}

type JobResult<T> = { data: T; inferenceSource: InferenceSource | undefined }

export type RouterDeps = {
  classify: (text: string, mode?: InferenceMode) => Promise<JobResult<IncidentType>>
  triage: (image: { base64: string; mimeType: string }, mode?: InferenceMode) => Promise<JobResult<TriageResult>>
  now: () => number
}

/** Maps the SDK's inferenceSource to our badge. Throws if missing/unknown: we never guess. */
export function toSource(s: InferenceSource | string | undefined): 'on-device' | 'cloud' {
  if (s === 'on_device') return 'on-device'
  if (s === 'in_cloud') return 'cloud'
  throw new Error(`SDK did not report a known inferenceSource (got ${JSON.stringify(s)})`)
}

const message = (e: unknown) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e))

export function createRouter(deps: RouterDeps) {
  async function run<T>(job: () => Promise<JobResult<T>>, fallback: T): Promise<Routed<T>> {
    const t0 = deps.now()
    const secs = () => Math.round((deps.now() - t0) / 10) / 100
    try {
      const r = await job()
      return { data: r.data, source: toSource(r.inferenceSource), seconds: secs() }
    } catch (e) {
      return { data: fallback, source: 'checklist', seconds: secs(), error: message(e) }
    }
  }

  return {
    /** Free-text description → incident type. Fallback: "unknown" → show incident tiles. */
    classify: (text: string, mode?: InferenceMode) => run(() => deps.classify(text, mode), 'unknown' as IncidentType),
    /** Ransom-screen photo → fixed fields. Fallback: null → user reads the screen. */
    triage: (image: { base64: string; mimeType: string }, mode?: InferenceMode) =>
      run<TriageResult | null>(() => deps.triage(image, mode), null),
  }
}

/** Default router wired to the real on-device jobs (lazy-loads Firebase). */
export const router = createRouter({
  classify: async (text, mode) => (await import('./nano')).classifyIncident(text, mode),
  triage: async (image, mode) => (await import('./nano')).triageRansomScreen(image, mode),
  now: () => performance.now(),
})
