/** (d) warm-up gating: only when the Prompt API says "available", one at a time, never throws. */
import { afterEach, describe, expect, it, vi } from 'vitest'

const warmOnDevice = vi.fn(async () => {})
vi.mock('../src/ai/nano', () => ({ warmOnDevice }))

const setLM = (availability: string | undefined) => {
  const g = globalThis as { LanguageModel?: unknown }
  if (availability === undefined) delete g.LanguageModel
  else g.LanguageModel = { availability: vi.fn(async () => availability) }
}

async function fresh() {
  vi.resetModules()
  return import('../src/ai/warmup')
}

afterEach(() => {
  setLM(undefined)
  warmOnDevice.mockReset()
  warmOnDevice.mockImplementation(async () => {})
})

describe('warmUpNano', () => {
  it('skips when the browser has no Prompt API', async () => {
    const w = await fresh()
    expect(await w.warmUpNano('t')).toMatchObject({ outcome: 'skipped', detail: 'Prompt API: no-prompt-api' })
    expect(warmOnDevice).not.toHaveBeenCalled()
  })
  it.each(['downloadable', 'downloading', 'unavailable'])('skips when availability is %s (never starts a download)', async (a) => {
    setLM(a)
    const w = await fresh()
    expect((await w.warmUpNano('t')).outcome).toBe('skipped')
    expect(warmOnDevice).not.toHaveBeenCalled()
  })
  it('warms through nano.warmOnDevice when available', async () => {
    setLM('available')
    const w = await fresh()
    expect(await w.warmUpNano('t')).toMatchObject({ outcome: 'warmed', reason: 't', idleSeconds: null })
    expect(warmOnDevice).toHaveBeenCalledTimes(1)
  })
  it('runs one warm-up at a time', async () => {
    setLM('available')
    const w = await fresh()
    const [a, b] = await Promise.all([w.warmUpNano('a'), w.warmUpNano('b')])
    expect(a).toBe(b)
    expect(warmOnDevice).toHaveBeenCalledTimes(1)
  })
  it('never throws: a failing warm-up is reported, not raised', async () => {
    setLM('available')
    warmOnDevice.mockRejectedValueOnce(new Error('boom'))
    const w = await fresh()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(await w.warmUpNano('t')).toMatchObject({ outcome: 'failed' })
    warn.mockRestore()
  })
})

describe('rewarmIfIdle', () => {
  it('re-warms only after REWARM_AFTER_MS of on-device idle', async () => {
    setLM('available')
    const w = await fresh()
    const t = vi.spyOn(performance, 'now').mockReturnValue(1_000)
    w.markOnDeviceActivity()
    t.mockReturnValue(1_000 + w.REWARM_AFTER_MS - 1)
    w.rewarmIfIdle('focus')
    await Promise.resolve()
    expect(warmOnDevice).not.toHaveBeenCalled()
    t.mockReturnValue(1_000 + w.REWARM_AFTER_MS)
    w.rewarmIfIdle('focus')
    await vi.waitFor(() => expect(warmOnDevice).toHaveBeenCalledTimes(1))
    t.mockRestore()
  })
})
