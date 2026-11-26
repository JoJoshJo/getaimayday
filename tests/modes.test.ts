/**
 * Session 8: which Firebase AI Logic InferenceMode each feature uses.
 * Rule: automatic cloud fallback only where the content is not sensitive
 * (everyday IT fix-its). Incident day stays ONLY_ON_DEVICE.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { InferenceMode } from 'firebase/ai'
import { describe, expect, it } from 'vitest'
import { askMode, mayAutoCloud, MODES } from '../src/ai/modes'
import type { Routed } from '../src/ai/router'
import type { AskResult } from '../src/ai/schemas'
import { answerQuestion, type AskDeps } from '../src/features/ask/answer'
import { scrubPersonal } from '../src/features/ask/scrub'
import { rawFixits } from '../src/fixits'
import { FixitSchema } from '../src/fixits/schema'
import { rawPlans } from '../src/plans'
import type { Plan } from '../src/plans/schema'

const src = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

describe('routing table', () => {
  it('uses the real SDK InferenceMode values', () => {
    const real = Object.values(InferenceMode) as string[]
    for (const m of Object.values(MODES)) expect(real).toContain(m)
  })

  it('one mode per feature, and only fix-it questions fall back to the cloud on their own', () => {
    expect(MODES).toEqual({
      classify: InferenceMode.ONLY_ON_DEVICE,
      triage: InferenceMode.ONLY_ON_DEVICE,
      incidentAsk: InferenceMode.ONLY_ON_DEVICE,
      fixitAsk: InferenceMode.PREFER_ON_DEVICE,
      triageCloudCheck: InferenceMode.PREFER_IN_CLOUD,
      pack: InferenceMode.ONLY_IN_CLOUD,
      documents: InferenceMode.ONLY_IN_CLOUD,
    })
    const auto = Object.values(InferenceMode).filter((m) => mayAutoCloud(m))
    expect(auto).toEqual([InferenceMode.PREFER_ON_DEVICE])
  })

  it('every incident plan asks ONLY_ON_DEVICE, every fix-it PREFER_ON_DEVICE (EN and FR)', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const p of Object.values(rawPlans[lang]) as Plan[]) expect(askMode(p)).toBe(InferenceMode.ONLY_ON_DEVICE)
      for (const raw of Object.values(rawFixits[lang])) {
        const f = FixitSchema.parse(raw)
        const guide = { ...f, packPlan: f.related ?? null }
        expect(askMode(guide)).toBe(InferenceMode.PREFER_ON_DEVICE)
      }
    }
  })

  it('anything unclear stays on the device', () => {
    expect(askMode({})).toBe(InferenceMode.ONLY_ON_DEVICE)
    expect(askMode({ topic: 'printer', incident: 'ransomware' })).toBe(InferenceMode.ONLY_ON_DEVICE)
  })

  it('incident-day code calls the router with no mode (the ONLY_ON_DEVICE default)', () => {
    expect(src('src/features/home/Home.tsx')).toMatch(/router\.classify\(description\)/)
    const triage = src('src/features/triage/FoundOnScreen.tsx')
    expect(triage).toMatch(/router\.triage\(\{ base64: await blobToBase64\(photo\.blob\), mimeType: photo\.mime \}\)/)
    expect(triage).toMatch(/MODES\.triageCloudCheck/)
    const nano = src('src/ai/nano.ts')
    for (const job of ['classifyIncident', 'askAboutStep', 'triageRansomScreen']) {
      expect(nano).toMatch(new RegExp(`${job}\\([^)]*mode: InferenceMode = InferenceMode\\.ONLY_ON_DEVICE`, 's'))
    }
    expect(src('src/ai/cloud.ts').match(/InferenceMode\.\w+/g)?.filter((m) => m !== 'InferenceMode.ONLY_IN_CLOUD')).toEqual([])
  })

  it('PREFER_ON_DEVICE appears nowhere in the app except the table and the test lab', () => {
    const files = ['src/features/home/Home.tsx', 'src/features/triage/FoundOnScreen.tsx', 'src/ai/nano.ts', 'src/ai/cloud.ts', 'src/features/ask/StepAsk.tsx', 'src/features/ask/answer.ts', 'src/App.tsx', 'src/features/fixit/FixitScreens.tsx', 'src/features/pack/PackScreen.tsx', 'src/features/online/BackOnline.tsx']
    for (const f of files) expect(src(f).replace(/^\s*(\/\/|\*|\/\*).*$/gm, '')).not.toMatch(/prefer_on_device|PREFER_ON_DEVICE/)
  })
})

const routed = (data: AskResult | null, source: Routed<unknown>['source']): Routed<AskResult | null> => ({ data, source, seconds: 0.1 })

function spyDeps(over: Partial<AskDeps> & { result?: Routed<AskResult | null> }) {
  const calls: { prompt: string; mode: string }[] = []
  const deps: AskDeps = {
    availability: async () => 'unavailable',
    online: () => true,
    loadPack: async () => null,
    ask: async (prompt, mode) => {
      calls.push({ prompt, mode })
      return over.result ?? routed({ in_plan: true, answer: 'Turn the router off for 30 seconds.' }, 'cloud')
    },
    ...over,
  }
  return { deps, calls }
}

describe('answerQuestion: incident plan (sensitive) never goes to the cloud', () => {
  const plan = rawPlans.en.ransomware as Plan
  const step = plan.steps[1]

  it('no Nano and online → no model call at all', async () => {
    const { deps, calls } = spyDeps({})
    const a = await answerQuestion('do I turn it off?', plan, step, 'en', deps)
    expect(calls).toEqual([])
    expect(a).toEqual({ kind: 'none', reason: 'no-pack' })
  })

  it('Nano available → ONLY_ON_DEVICE, question unchanged', async () => {
    const { deps, calls } = spyDeps({ availability: async () => 'available', result: routed({ in_plan: true, answer: 'Unplug the cable.' }, 'on-device') })
    const a = await answerQuestion('call me on 555-0142', plan, step, 'en', deps)
    expect(calls.map((c) => c.mode)).toEqual([InferenceMode.ONLY_ON_DEVICE])
    expect(calls[0].prompt).toContain('555-0142')
    expect(a).toEqual({ kind: 'ai', source: 'on-device', text: 'Unplug the cable.' })
  })

  it('a cloud answer is never accepted on an incident plan', async () => {
    const { deps } = spyDeps({ availability: async () => 'available', result: routed({ in_plan: true, answer: 'Unplug it.' }, 'cloud') })
    expect((await answerQuestion('unplug?', plan, step, 'en', deps)).kind).toBe('none')
  })
})

describe('answerQuestion: fix-it (not sensitive) uses PREFER_ON_DEVICE', () => {
  const fixit = FixitSchema.parse(rawFixits.en.wifi)
  const guide = { ...fixit, packPlan: fixit.related ?? null }
  const step = fixit.steps[0]

  it('Nano available → PREFER_ON_DEVICE, On-device badge', async () => {
    const { deps, calls } = spyDeps({ availability: async () => 'available', result: routed({ in_plan: true, answer: 'Wait 30 seconds.' }, 'on-device') })
    const a = await answerQuestion('how long?', guide, step, 'en', deps)
    expect(calls.map((c) => c.mode)).toEqual([InferenceMode.PREFER_ON_DEVICE])
    expect(a).toEqual({ kind: 'ai', source: 'on-device', text: 'Wait 30 seconds.' })
  })

  it('no Nano, online → the SDK answers in the cloud, Cloud badge', async () => {
    const { deps, calls } = spyDeps({ availability: async () => 'downloadable' })
    const a = await answerQuestion('how long?', guide, step, 'en', deps)
    expect(calls.map((c) => c.mode)).toEqual([InferenceMode.PREFER_ON_DEVICE])
    expect(a).toEqual({ kind: 'ai', source: 'cloud', text: 'Turn the router off for 30 seconds.' })
  })

  it('no Nano, offline → no call, the existing fallback', async () => {
    const { deps, calls } = spyDeps({ online: () => false })
    const a = await answerQuestion('how long?', guide, step, 'en', deps)
    expect(calls).toEqual([])
    expect(a.kind).toBe('none')
  })

  it('the cloud call fails → the existing fallback, never a made-up answer', async () => {
    const { deps } = spyDeps({ result: routed(null, 'checklist') })
    expect((await answerQuestion('how long?', guide, step, 'en', deps)).kind).toBe('none')
  })

  it('unsafe or off-plan cloud answers are dropped', async () => {
    for (const result of [routed({ in_plan: true, answer: 'Reinstall Windows.' }, 'cloud'), routed({ in_plan: false, answer: '' }, 'cloud')]) {
      const { deps } = spyDeps({ result })
      expect((await answerQuestion('how long?', guide, step, 'en', deps)).kind).toBe('none')
    }
  })

  it('emails and phone numbers are removed before the question is sent', async () => {
    const { deps, calls } = spyDeps({})
    await answerQuestion('I am pat@sunrise-dental.example, call 555-0142. Error 0x80070005', guide, step, 'en', deps)
    expect(calls[0].prompt).not.toMatch(/pat@|555-0142/)
    expect(calls[0].prompt).toContain('[email removed]')
    expect(calls[0].prompt).toContain('[phone number removed]')
    expect(calls[0].prompt).toContain('0x80070005')
  })
})

describe('scrubPersonal', () => {
  it.each([
    ['mail pat.lee+it@sunrise-dental.example now', 'mail [email removed] now'],
    ['call 555-0142', 'call [phone number removed]'],
    ['call (555) 012-3456 today', 'call [phone number removed] today'],
    ['+1 555 012 3456', '[phone number removed]'],
    ['5550123456', '[phone number removed]'],
  ])('removes %s', (input, out) => expect(scrubPersonal(input, 'en')).toBe(out))

  it('French placeholders', () => {
    expect(scrubPersonal('écrivez à anne@exemple.fr ou au 06 12 34 56 78', 'fr')).toBe('écrivez à [adresse e-mail retirée] ou au [numéro retiré]')
  })

  it.each(['error 0x80070005', 'code 80070005', 'since 2026-11-26', 'router at 192.168.1.1', 'Windows 11, port 8080', 'it froze 3 times'])(
    'keeps IT details: %s',
    (input) => expect(scrubPersonal(input, 'en')).toBe(input),
  )
})
