/**
 * Session 3b hardening: (a) confidence computed in code, (b) non-answers → null.
 * Fixtures are J's REAL on-device outputs from spike S2 (2026-11-24, M2 8 GB Mac).
 */
import { describe, expect, it } from 'vitest'
import { computeConfidence, dropNonAnswers, isNonAnswer, normalizeTriage, parseJson, TriageRaw } from '../src/ai/schemas'

const J_S2 = {
  s1: '{"incident_type":"ransomware","ransom_amount":0.35,"currency":"BTC","group_name":"PAPERWOLF","contact_method":"fake-negotiator@example.invalid","deadline":"72 hours","file_extension":".pwlf","confidence":"high"}',
  s4: '{"incident_type":"ransomware","ransom_amount":500,"currency":"EUR","group_name":"CRYPTO","contact_method":"wallet","deadline":"3 days","file_extension":".crypt","confidence":"high"}',
  s5: '{"incident_type":"ransomware","ransom_amount":0,"currency":"USD","group_name":"unknown","contact_method":"+1 555 0100","deadline":"unknown","file_extension":"unknown","confidence":"high"}',
}
const triage = (text: string) => normalizeTriage(parseJson(text, TriageRaw))

describe('(b) non-answers become null before validation', () => {
  it.each(['unknown', 'Unknown', ' UNKNOWN ', '', 'N/A', 'none', 'null', 'not visible', '-', '?', 'inconnu', 'non visible', '(unknown)', '"unknown"'])(
    'string %j is a non-answer',
    (v) => expect(isNonAnswer(v)).toBe(true),
  )
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, null, undefined])('value %j is a non-answer', (v) => expect(isNonAnswer(v)).toBe(true))
  it.each(['PAPERWOLF', '.pwlf', '72 hours', 'Known Group', 0.35, 25000])('real value %j is kept', (v) => expect(isNonAnswer(v)).toBe(false))

  it('only touches the six optional fields (incident_type "unknown" is a valid enum answer)', () => {
    expect(dropNonAnswers({ incident_type: 'unknown', confidence: 'low', group_name: 'unknown' })).toEqual({ incident_type: 'unknown', confidence: 'low' })
  })

  it("J's sample 5: 0 / \"unknown\" become null instead of data", () => {
    const r = triage(J_S2.s5)
    expect(r.ransom_amount).toBeNull()
    expect(r.group_name).toBeNull()
    expect(r.deadline).toBeNull()
    expect(r.file_extension).toBeNull()
    expect(r.contact_method).toBe('+1 555 0100')
    expect(r.currency).toBe('USD') // an invented real-looking value can't be detected here → user confirms (DESIGN.md)
  })

  it('a model null is accepted as "absent" (not a schema error)', () => {
    expect(triage('{"incident_type":"ransomware","group_name":null,"confidence":"low"}').group_name).toBeNull()
  })

  it('extra fields are still rejected after normalization', () => {
    expect(() => parseJson('{"incident_type":"ransomware","confidence":"high","advice":"pay now"}', TriageRaw)).toThrow()
  })
})

describe('(a) confidence is computed in code', () => {
  const base = { incident_type: 'ransomware' as const, ransom_amount: null, currency: null, group_name: null, contact_method: null, deadline: null, file_extension: null }
  it('high = incident_type + ≥3 fields', () => expect(computeConfidence({ ...base, ransom_amount: 1, currency: 'BTC', deadline: '3 days' })).toBe('high'))
  it('medium = 1–2 fields', () => {
    expect(computeConfidence({ ...base, currency: 'BTC' })).toBe('medium')
    expect(computeConfidence({ ...base, currency: 'BTC', deadline: 'x' })).toBe('medium')
  })
  it('low = none found', () => expect(computeConfidence(base)).toBe('low'))
  it('low when incident_type is unknown, whatever was found', () =>
    expect(computeConfidence({ ...base, incident_type: 'unknown', ransom_amount: 1, currency: 'BTC', deadline: 'x' })).toBe('low'))

  it("J's samples: the model's own 'high' is kept only as debug", () => {
    const s1 = triage(J_S2.s1)
    expect(s1.confidence).toBe('high')
    expect(s1.model_confidence).toBe('high')
    const s5 = triage(J_S2.s5)
    expect(s5.model_confidence).toBe('high')
    expect(s5.confidence).toBe('medium') // only currency + contact survive normalization
    expect(triage(J_S2.s4).confidence).toBe('high') // invented "CRYPTO" still counts: why every field needs user confirmation
  })
})
