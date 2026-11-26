/**
 * Retry for cloud Pack calls (Session 6). Pure logic: sleep and random are
 * injected so tests run instantly.
 *
 * Retried (they can pass a few seconds later): HTTP 408, 429, 500, 502, 503,
 * 504, and network failures (no HTTP status: "Failed to fetch", timeout).
 * Never retried: other 4xx (400 bad request, 401/403 App Check or key, 404
 * unknown model) and anything after a response arrived (bad JSON, schema).
 *
 * Status comes from AI Logic's AIError.customErrorData.status (verified in
 * @firebase/ai 3.1.0: FETCH_ERROR carries {status, statusText, errorDetails};
 * a network failure becomes AIError code "error" with no status).
 */

export const RETRY_DELAYS_MS = [2_000, 5_000, 12_000] as const
const TRANSIENT_STATUS = new Set([408, 429, 500, 502, 503, 504])
const NETWORK = /failed to fetch|networkerror|network error|load failed|timed? ?out|timeout|aborted|err_network|err_internet/i

type ErrLike = { name?: string; code?: string; message?: string; customErrorData?: { status?: number } }

export function httpStatus(e: unknown): number | undefined {
  const s = (e as ErrLike | null)?.customErrorData?.status
  if (typeof s === 'number') return s
  const m = (e as ErrLike | null)?.message?.match(/\[(\d{3})\b/)
  return m ? Number(m[1]) : undefined
}

export function isTransient(e: unknown): boolean {
  const status = httpStatus(e)
  if (status !== undefined) return TRANSIENT_STATUS.has(status)
  const err = e as ErrLike | null
  if (!err) return false
  if (err.name === 'AbortError' || err.name === 'TimeoutError') return true
  // AI Logic wraps fetch's TypeError as code "error"; the original text stays in the message.
  return (err.name === 'TypeError' || err.code === 'error' || err.code === 'fetch-error') && NETWORK.test(err.message ?? '')
}

/** 401/403: App Check, API key or permissions. Another model will not help. */
export const isAuthError = (e: unknown) => [401, 403].includes(httpStatus(e) ?? 0)

/** Base delay ± 25 % jitter, so many clients do not retry in step. */
export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const base = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]
  return Math.round(base * (0.75 + random() * 0.5))
}

export type RetryOpts = {
  retries?: number
  sleep?: (ms: number) => Promise<void>
  random?: () => number
  /** Called before each wait: attempt is 1-based (1 = first retry). */
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void
  /** Stop early (user pressed Stop). */
  cancelled?: () => boolean
}

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export async function withRetry<T>(fn: () => Promise<T>, o: RetryOpts = {}): Promise<T> {
  const retries = o.retries ?? RETRY_DELAYS_MS.length
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (e) {
      if (attempt >= retries || !isTransient(e) || o.cancelled?.()) throw e
      const delay = backoffDelay(attempt, o.random)
      o.onRetry?.(attempt + 1, delay, e)
      await (o.sleep ?? realSleep)(delay)
    }
  }
}

export type ModelCall<R> = (prompt: string, jsonSchema: object, model?: string) => Promise<R>

/**
 * Main model with retries; if it still fails and a fallback model is set
 * (Remote Config `cloud_model_fallback`), one more try with that model.
 * No fallback after 401/403: the problem is access, not the model.
 */
export function resilient<R>(call: ModelCall<R>, o: RetryOpts & { fallbackModel?: string; onFallback?: (model: string, error: unknown) => void } = {}) {
  return async (prompt: string, jsonSchema: object): Promise<R> => {
    try {
      return await withRetry(() => call(prompt, jsonSchema), o)
    } catch (e) {
      const fb = o.fallbackModel?.trim()
      if (!fb || isAuthError(e) || o.cancelled?.()) throw e
      o.onFallback?.(fb, e)
      return call(prompt, jsonSchema, fb)
    }
  }
}
