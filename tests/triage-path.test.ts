/**
 * Session 12b: the Lab and the real app ("Found on screen" panel) both call router.triage,
 * which runs triageRansomScreen → triageFromModelText. This test drives that exact call
 * with the SDK mocked to return the text Nano gave on the live site (sample 4, group_name ",").
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

let modelText = ''
vi.mock('../src/ai/firebase', () => ({ ai: {} }))
vi.mock('../src/ai/remoteConfig', () => ({ getCloudModel: () => 'test-model', initRemoteConfig: async () => {} }))
vi.mock('firebase/ai', async (orig) => ({
  ...(await orig<typeof import('firebase/ai')>()),
  getGenerativeModel: () => ({
    generateContent: async () => ({ response: { text: () => modelText, inferenceSource: 'on_device' } }),
  }),
}))

const { router } = await import('../src/ai/router')
const { triageFromModelText } = await import('../src/ai/schemas')
const image = { base64: 'AAAA', mimeType: 'image/png' }

/** J's live run, sample 4 (Session 12b): every field right except group_name ",". */
const SAMPLE4_LIVE = JSON.stringify({
  incident_type: 'ransomware',
  is_ransom_demand: true,
  ransom_amount: 500,
  currency: 'EUR',
  group_name: ',',
  contact_method: 'wallet',
  deadline: '3 days',
  file_extension: '.crypt7',
  confidence: 'high',
})

describe('Session 12b: one triage path for the Lab and the app', () => {
  beforeEach(() => (modelText = ''))

  it('router.triage (what the UI calls) returns group_name null and keeps the model text as raw', async () => {
    modelText = SAMPLE4_LIVE
    const r = await router.triage(image)
    expect(r.source).toBe('on-device')
    expect(r.data?.group_name).toBeNull()
    expect(r.raw).toBe(SAMPLE4_LIVE) // Lab "Model raw"
    expect(r.data).toEqual(triageFromModelText(SAMPLE4_LIVE)) // Lab "After checks" = app data
  })

  it('"," is not counted as found: it cannot lift confidence to "high"', async () => {
    // Same answer with only two real fields: "," would have been the third (high) before Session 12.
    modelText = JSON.stringify({ ...JSON.parse(SAMPLE4_LIVE), currency: undefined, deadline: undefined, file_extension: undefined })
    const r = await router.triage(image)
    expect(r.data?.group_name).toBeNull()
    expect(r.data?.confidence).toBe('medium')
    expect(r.data?.model_confidence).toBe('high')
  })

  it('sample 4 as returned still has 5 real fields, so computed confidence stays "high" (rule: ≥ 3 found)', async () => {
    modelText = SAMPLE4_LIVE
    expect((await router.triage(image)).data?.confidence).toBe('high')
  })

  it('bad JSON falls back to the checklist and still shows the model text in the Lab', async () => {
    modelText = 'not json'
    const r = await router.triage(image)
    expect(r).toMatchObject({ data: null, source: 'checklist', raw: 'not json' })
  })
})
