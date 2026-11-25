/**
 * (Session 3b, d) Background warm-up of the on-device model.
 *
 * Why: spike S1 on J's M2 8 GB Mac showed cold calls take 11–16 s, warm ones
 * 1–2 s, and Chrome unloads the model after roughly 15–25 s idle (even though
 * the SDK keeps its last session open). So we warm once after the app shell
 * loads and re-warm when the user comes back after a long idle.
 *
 * Rules:
 *  - This module has NO Firebase import: main.tsx can import it without pulling
 *    Firebase into the app shell. The warm call itself is lazy-loaded from
 *    ./nano and goes through Firebase AI Logic (MASTER §0 rule 5).
 *  - Only warms when LanguageModel.availability() says "available". That is a
 *    check, not inference, and it never starts a download (a download needs a
 *    user gesture: prepareOnDevice).
 *  - Never blocks the UI: scheduled on idle, errors are swallowed and logged.
 *  - One warm-up at a time.
 */

/** Same create options for every on-device session (availability check + SDK). */
export const ON_DEVICE_IO = {
  // Default is English text + image; declare French input too (Chrome 149+ supports FR).
  expectedInputs: [
    { type: 'text' as const, languages: ['en', 'fr'] },
    { type: 'image' as const },
  ],
  expectedOutputs: [{ type: 'text' as const, languages: ['en'] }],
}

/** Re-warm when the last on-device activity is older than this (S1: unloaded after ~15–25 s). */
export const REWARM_AFTER_MS = 15_000

/** Thresholds the lab uses to label a run cold or warm (S1/S2 timings). */
export const COLD_AFTER_SECONDS = { classify: 5, triage: 10 } as const

export type WarmEvent = {
  at: string
  reason: string
  outcome: 'warmed' | 'skipped' | 'failed'
  detail: string
  seconds: number
  /** Idle time before this warm-up, in seconds (null = no on-device call yet). */
  idleSeconds: number | null
}

const now = () => performance.now()
let lastOnDevice: number | null = null
let inFlight: Promise<WarmEvent> | null = null
const listeners = new Set<(e: WarmEvent) => void>()
let lastEvent: WarmEvent | null = null

/** Called after every on-device call (real or warm-up). */
export function markOnDeviceActivity(): void {
  lastOnDevice = now()
}

/** Seconds since the last on-device call ended, or null if there was none. */
export function idleSeconds(): number | null {
  return lastOnDevice === null ? null : (now() - lastOnDevice) / 1000
}

export function onWarmEvent(fn: (e: WarmEvent) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export const lastWarmEvent = () => lastEvent

type LM = { availability: (o?: object) => Promise<string> }

/** Chrome Prompt API availability, if the API exists in this browser. */
export async function onDeviceAvailability(): Promise<string> {
  const LanguageModel = (globalThis as { LanguageModel?: LM }).LanguageModel
  if (!LanguageModel) return 'no-prompt-api'
  try {
    return await LanguageModel.availability(ON_DEVICE_IO)
  } catch (e) {
    return `error: ${(e as Error).message}`
  }
}

function emit(e: WarmEvent): WarmEvent {
  lastEvent = e
  for (const fn of listeners) fn(e)
  if (e.outcome === 'failed') console.warn('[AIMayday] warm-up failed:', e.detail)
  return e
}

/**
 * Warm the on-device model now (no-op if not available or already warming).
 * Never throws.
 */
export function warmUpNano(reason = 'manual'): Promise<WarmEvent> {
  inFlight ??= (async () => {
    const idle = idleSeconds()
    const at = new Date().toLocaleTimeString()
    const t0 = now()
    const done = (outcome: WarmEvent['outcome'], detail: string) =>
      emit({ at, reason, outcome, detail, seconds: Math.round((now() - t0) / 10) / 100, idleSeconds: idle === null ? null : Math.round(idle * 10) / 10 })
    try {
      const avail = await onDeviceAvailability()
      if (avail !== 'available') return done('skipped', `Prompt API: ${avail}`)
      const { warmOnDevice } = await import('./nano')
      await warmOnDevice()
      return done('warmed', 'on-device')
    } catch (e) {
      return done('failed', String(e))
    }
  })().finally(() => {
    inFlight = null
  })
  return inFlight
}

/** Re-warm only if the model has probably been unloaded. */
export function rewarmIfIdle(reason: string): void {
  const idle = idleSeconds()
  if (idle === null || idle * 1000 >= REWARM_AFTER_MS) void warmUpNano(reason)
}

let started = false

/**
 * Call once after the app shell has rendered. Schedules the first warm-up on
 * idle and re-warms when the tab becomes visible / focused after a long idle.
 */
export function startWarmup(): void {
  if (started || typeof window === 'undefined') return
  started = true
  // First idle moment, with a plain timer as backstop (browsers without
  // requestIdleCallback, or a busy main thread). Runs once.
  let fired = false
  const once = () => {
    if (fired) return
    fired = true
    void warmUpNano('app-load')
  }
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(once, { timeout: 3_000 })
  setTimeout(once, 3_000)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') rewarmIfIdle('tab-visible')
  })
  window.addEventListener('focus', () => rewarmIfIdle('focus'))
}
