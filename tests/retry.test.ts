/**
 * Session 6: Pack build resilience. Retry/backoff (mocked clock), fallback model,
 * failed parts kept across reloads, FR safety-guard fix, same item count per language.
 */
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { planChunkPrompt } from '../src/ai/prompts/pack'
import { SAMPLE_CONTACTS, SAMPLE_PROFILE } from '../src/features/setup/model'
import { packJobs } from '../src/pack/build'
import { isUnsafeAdvice } from '../src/pack/guard'
import { backoffDelay, httpStatus, isAuthError, isTransient, resilient, RETRY_DELAYS_MS, withRetry } from '../src/pack/retry'
import { QA_MIN, type Chunk } from '../src/pack/schema'
import { beginBuild, loadPack, markFailed, partsToRetry, saveChunk } from '../src/pack/store'
import { rawPlans } from '../src/plans'
import type { Plan } from '../src/plans/schema'
import { db } from '../src/storage/db'

/** Same shape as @firebase/ai's AIError (code + customErrorData.status). */
const aiError = (status: number, text = 'x') =>
  Object.assign(new Error(`Error fetching from https://firebasevertexai.googleapis.com/...: [${status} ] ${text}`), { code: 'fetch-error', customErrorData: { status } })
const networkError = () => Object.assign(new Error('Error fetching from https://firebasevertexai.googleapis.com/...: Failed to fetch'), { code: 'error' })

describe('which errors are retried', () => {
  it.each([408, 429, 500, 502, 503, 504])('HTTP %i is transient', (s) => expect(isTransient(aiError(s))).toBe(true))
  it.each([400, 401, 403, 404])('HTTP %i is not retried', (s) => expect(isTransient(aiError(s))).toBe(false))
  it('the live failure text (500 "high demand") is transient', () =>
    expect(isTransient(aiError(500, 'This model is currently experiencing high demand. Please try again later.'))).toBe(true))
  it('network failure with no status is transient', () => expect(isTransient(networkError())).toBe(true))
  it('timeout / abort is transient', () => expect(isTransient(Object.assign(new Error('signal timed out'), { name: 'AbortError' }))).toBe(true))
  it('bad JSON or schema errors are not retried', () => {
    expect(isTransient(new SyntaxError('Unexpected token'))).toBe(false)
    expect(isTransient(new Error('Pack chunk had no usable answers'))).toBe(false)
  })
  it('reads the status from the message when customErrorData is missing', () => expect(httpStatus(new Error('Error fetching: [503 Service Unavailable] busy'))).toBe(503))
  it('401 / 403 are access errors', () => {
    expect(isAuthError(aiError(401))).toBe(true)
    expect(isAuthError(aiError(403))).toBe(true)
    expect(isAuthError(aiError(500))).toBe(false)
  })
})

describe('backoff', () => {
  it('about 2 s, 5 s, 12 s, each within ± 25 %', () => {
    RETRY_DELAYS_MS.forEach((base, i) => {
      expect(backoffDelay(i, () => 0)).toBe(base * 0.75)
      expect(backoffDelay(i, () => 1)).toBe(base * 1.25)
      expect(backoffDelay(i, () => 0.5)).toBe(base)
    })
  })
  it('jitter spreads retries', () => expect(new Set([0.1, 0.4, 0.9].map((r) => backoffDelay(1, () => r))).size).toBe(3))
})

describe('withRetry', () => {
  const sleep = vi.fn(async () => {})
  beforeEach(() => sleep.mockClear())

  it('succeeds after two busy answers, waiting 2 s then 5 s', async () => {
    const fn = vi.fn().mockRejectedValueOnce(aiError(500)).mockRejectedValueOnce(aiError(503)).mockResolvedValue('ok')
    const onRetry = vi.fn()
    await expect(withRetry(fn, { sleep, random: () => 0.5, onRetry })).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
    expect(sleep.mock.calls).toEqual([[2000], [5000]])
    expect(onRetry.mock.calls.map((c) => c[0])).toEqual([1, 2])
  })

  it('gives up after 3 retries (4 calls) and throws the last error', async () => {
    const fn = vi.fn().mockRejectedValue(aiError(429))
    await expect(withRetry(fn, { sleep, random: () => 0.5 })).rejects.toMatchObject({ customErrorData: { status: 429 } })
    expect(fn).toHaveBeenCalledTimes(4)
    expect(sleep.mock.calls).toEqual([[2000], [5000], [12000]])
  })

  it.each([400, 401, 403])('never retries HTTP %i', async (s) => {
    const fn = vi.fn().mockRejectedValue(aiError(s))
    await expect(withRetry(fn, { sleep })).rejects.toBeTruthy()
    expect(fn).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })

  it('stops retrying when the user pressed Stop', async () => {
    const fn = vi.fn().mockRejectedValue(aiError(503))
    await expect(withRetry(fn, { sleep, cancelled: () => true })).rejects.toBeTruthy()
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('fallback model (Remote Config cloud_model_fallback)', () => {
  const sleep = async () => {}
  it('no fallback set: fails after retries, the fallback is never called', async () => {
    const call = vi.fn().mockRejectedValue(aiError(500))
    await expect(resilient(call, { sleep, fallbackModel: '' })('p', {})).rejects.toBeTruthy()
    expect(call).toHaveBeenCalledTimes(4)
    expect(call.mock.calls.every((c) => c[2] === undefined)).toBe(true)
  })
  it('fallback set: one more try with that model after retries', async () => {
    const call = vi.fn(async (_p: string, _s: object, model?: string) => {
      if (model) return `ok from ${model}`
      throw aiError(500)
    })
    const onFallback = vi.fn()
    await expect(resilient(call, { sleep, fallbackModel: 'gemini-3.1-flash-lite', onFallback })('p', {})).resolves.toBe('ok from gemini-3.1-flash-lite')
    expect(call).toHaveBeenCalledTimes(5)
    expect(onFallback).toHaveBeenCalledWith('gemini-3.1-flash-lite', expect.anything())
  })
  it('fallback is tried once only, not retried', async () => {
    const call = vi.fn().mockRejectedValue(aiError(503))
    await expect(resilient(call, { sleep, fallbackModel: 'other' })('p', {})).rejects.toBeTruthy()
    expect(call).toHaveBeenCalledTimes(5)
  })
  it('no fallback after 401/403 (access problem, not the model)', async () => {
    const call = vi.fn().mockRejectedValue(aiError(401))
    await expect(resilient(call, { sleep, fallbackModel: 'other' })('p', {})).rejects.toBeTruthy()
    expect(call).toHaveBeenCalledTimes(1)
  })
})

describe('failed parts are kept and can be retried alone', () => {
  beforeEach(async () => {
    await db.kv.clear()
  })
  const chunk: Chunk = { kind: 'glossary', lang: 'en', generated_at: 1, model: 'm', terms: [{ term: 'a', plain: 'b' }] }
  const keys = packJobs(SAMPLE_PROFILE, SAMPLE_CONTACTS).map((j) => j.key)

  it('a failure is stored, survives a reload, and is cleared when the part saves', async () => {
    await beginBuild('h')
    for (const k of keys.filter((k) => k !== 'fr:outage' && k !== 'fr:phishing')) await saveChunk(k, chunk)
    await markFailed('fr:outage', 'HTTP 500')
    await markFailed('fr:phishing', 'HTTP 500')
    expect(partsToRetry(await loadPack(), 'h', keys)).toEqual(['fr:outage', 'fr:phishing'])
    await saveChunk('fr:outage', chunk)
    expect(partsToRetry(await loadPack(), 'h', keys)).toEqual(['fr:phishing'])
    expect((await loadPack())!.version).toBe(1) // retrying does not start a new build
  })
  it('a part that failed on a rebuild is listed even though an older copy is kept', async () => {
    await beginBuild('h')
    for (const k of keys) await saveChunk(k, chunk)
    await beginBuild('h')
    await markFailed('en:bec', 'HTTP 503')
    const p = await loadPack()
    expect(p!.chunks['en:bec']).toBeDefined()
    expect(partsToRetry(p, 'h', keys)).toEqual(['en:bec'])
  })
  it('a new full build clears the failed list', async () => {
    await beginBuild('h')
    await markFailed('en:bec', 'x')
    await beginBuild('h')
    expect((await loadPack())!.failed).toEqual({})
  })
  it('nothing to retry when the setup changed (a full build is needed)', async () => {
    await beginBuild('h')
    await markFailed('en:bec', 'x')
    expect(partsToRetry(await loadPack(), 'other', keys)).toEqual([])
  })
  it('older Packs without a failed list still load', async () => {
    await beginBuild('h')
    const p = await loadPack()
    const { failed: _f, ...old } = p!
    void _f
    await db.kv.put({ key: 'pack', value: old, updated_at: 1 })
    expect(await loadPack()).not.toBeNull()
  })
})

describe('FR coverage (Session 6 · 4)', () => {
  it('safe French "do not" sentences are kept (curly apostrophe, évitez, aucun)', () => {
    for (const s of [
      'N’essayez pas de réinstaller l’ordinateur.',
      'Évitez de payer la rançon.',
      'Ne formatez pas le disque.',
      'Aucun paiement : ne payez pas la rançon.',
      'Don’t wipe the computer.',
    ])
      expect(isUnsafeAdvice(s), s).toBe(false)
  })
  it('unsafe advice is still caught in both languages', () => {
    for (const s of ['Payez la rançon pour récupérer vos fichiers.', 'Réinstallez Windows.', 'Wipe the computer and start again.', 'Contactez les pirates pour négocier.'])
      expect(isUnsafeAdvice(s), s).toBe(true)
  })
  it('the prompt asks for the same firm number of items in every language', () => {
    for (const lang of ['en', 'fr'] as const) {
      const pr = planChunkPrompt(rawPlans[lang].outage as Plan, lang, 'ctx')
      expect(pr).toMatch(/Write 30 items \(never fewer than 24\)/)
      expect(pr).toMatch(/same whatever the language/)
    }
  })
  it('the JSON schema asks for at least QA_MIN items', () => {
    const job = packJobs(SAMPLE_PROFILE, SAMPLE_CONTACTS).find((j) => j.key === 'fr:outage')!
    expect((job.jsonSchema as { properties: { qa: { minItems: number } } }).properties.qa.minItems).toBe(QA_MIN)
  })
})
