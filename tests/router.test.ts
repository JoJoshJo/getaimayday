import { describe, expect, it } from 'vitest'
import { createRouter, toSource, type RouterDeps } from '../src/ai/router'
import { ClassifyResult, normalizeTriage, parseJson, TriageRaw, AiOutputError } from '../src/ai/schemas'

function deps(over: Partial<RouterDeps>): RouterDeps {
  let t = 0
  return {
    classify: async () => ({ data: 'ransomware', inferenceSource: 'on_device' }),
    triage: async () => ({ data: null as never, inferenceSource: 'on_device' }),
    now: () => (t += 1500), // each call advances 1.5 s
    ...over,
  }
}

describe('toSource', () => {
  it('maps SDK values', () => {
    expect(toSource('on_device')).toBe('on-device')
    expect(toSource('in_cloud')).toBe('cloud')
  })
  it('refuses to guess when the SDK gives no source', () => {
    expect(() => toSource(undefined)).toThrow()
    expect(() => toSource('ON_DEVICE')).toThrow()
  })
})

describe('router.classify', () => {
  it('returns data + real source + seconds', async () => {
    const r = await createRouter(deps({})).classify('files are locked')
    expect(r).toEqual({ data: 'ransomware', source: 'on-device', seconds: 1.5 })
  })
  it('labels a cloud answer as cloud', async () => {
    const r = await createRouter(deps({ classify: async () => ({ data: 'outage', inferenceSource: 'in_cloud' }) })).classify('x')
    expect(r.source).toBe('cloud')
    expect(r.data).toBe('outage')
  })
  it('falls back to checklist/unknown when on-device is unavailable', async () => {
    const r = await createRouter(
      deps({
        classify: async () => {
          throw new Error('Inference mode is ONLY_ON_DEVICE, but an on-device model is not available.')
        },
      }),
    ).classify('x')
    expect(r.source).toBe('checklist')
    expect(r.data).toBe('unknown')
    expect(r.error).toMatch(/on-device model is not available/)
  })
  it('falls back when the SDK omits inferenceSource (no fake labels)', async () => {
    const r = await createRouter(deps({ classify: async () => ({ data: 'phishing', inferenceSource: undefined }) })).classify('x')
    expect(r.source).toBe('checklist')
    expect(r.data).toBe('unknown')
  })
})

describe('router.triage', () => {
  it('falls back to checklist/null on error', async () => {
    const r = await createRouter(
      deps({
        triage: async () => {
          throw new Error('boom')
        },
      }),
    ).triage({ base64: '', mimeType: 'image/png' })
    expect(r).toMatchObject({ data: null, source: 'checklist', error: 'Error: boom' })
  })
})

describe('model output validation', () => {
  it('accepts a valid classify answer, with or without a code fence', () => {
    expect(parseJson('{"incident":"ransomware"}', ClassifyResult)).toEqual({ incident: 'ransomware' })
    expect(parseJson('```json\n{"incident":"outage"}\n```', ClassifyResult)).toEqual({ incident: 'outage' })
  })
  it('rejects values outside the enum and extra fields', () => {
    expect(() => parseJson('{"incident":"pay_now"}', ClassifyResult)).toThrow(AiOutputError)
    expect(() => parseJson('{"incident":"ransomware","advice":"pay"}', ClassifyResult)).toThrow(AiOutputError)
    expect(() => parseJson('Sure! ransomware', ClassifyResult)).toThrow(AiOutputError)
  })
  it('triage: missing fields become null, extra fields (e.g. injected advice) are rejected', () => {
    const raw = parseJson('{"incident_type":"ransomware","ransom_amount":0.5,"currency":"BTC","confidence":"high"}', TriageRaw)
    expect(normalizeTriage(raw)).toEqual({
      incident_type: 'ransomware',
      ransom_amount: 0.5,
      currency: 'BTC',
      group_name: null,
      contact_method: null,
      deadline: null,
      file_extension: null,
      confidence: 'high',
    })
    expect(() => parseJson('{"incident_type":"ransomware","confidence":"high","advice":"pay now"}', TriageRaw)).toThrow(AiOutputError)
  })
})
