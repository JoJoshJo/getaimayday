/** (d) warm-up gating: only when the Prompt API says "available", one at a time, never throws. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

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
  // Session 12: the photo picker and the description box call rewarmIfIdle. Opening the picker
  // (label click + input click) must never start a second on-device warm-up at the same time.
  it('several triggers while warming → one warm-up call (no extra sessions)', async () => {
    setLM('available')
    let release = () => {}
    warmOnDevice.mockImplementation(() => new Promise<void>((r) => (release = r)))
    const w = await fresh()
    w.rewarmIfIdle('photo-picker')
    w.rewarmIfIdle('photo-picker')
    w.rewarmIfIdle('describe-focus')
    await vi.waitFor(() => expect(warmOnDevice).toHaveBeenCalledTimes(1))
    release()
    await vi.waitFor(() => expect(w.lastWarmEvent()?.outcome).toBe('warmed'))
    expect(warmOnDevice).toHaveBeenCalledTimes(1)
  })
  it('no on-device model → no warm-up (never the cloud)', async () => {
    setLM('downloadable')
    const w = await fresh()
    w.rewarmIfIdle('photo-picker')
    await vi.waitFor(() => expect(w.lastWarmEvent()?.outcome).toBe('skipped'))
    expect(warmOnDevice).not.toHaveBeenCalled()
  })
})

describe('Session 12b: picking a photo re-warms (Lab samples, Lab file, real app photo)', () => {
  const src = (p: string) => readFileSync(join(__dirname, '..', 'src', p), 'utf8')
  it('Lab: the sample pick and the file pick call rewarmIfIdle (mouse and keyboard)', () => {
    const lab = src('features/lab/Lab.tsx')
    expect(lab).toMatch(/async function pickSample[^{]*\{\s*(\/\/.*\s*)?rewarmIfIdle\('photo-picker'\)/)
    expect(lab).toMatch(/function pickFile[^{]*\{\s*if \(f\) rewarmIfIdle\('photo-picker'\)/)
  })
  it('real app: the incident log photo input re-warms on change', () => {
    expect(src('features/log/IncidentLog.tsx')).toMatch(/onChange=\{\(e\) => \{[\s\S]{0,200}rewarmIfIdle\('photo-picker'\)/)
  })
})
