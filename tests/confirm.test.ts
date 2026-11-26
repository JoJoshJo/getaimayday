/** Session 4 feature 3: found-on-screen panel logic (DESIGN.md §6). */
import { describe, expect, it } from 'vitest'
import { normalizeTriage, parseJson, TriageRaw } from '../src/ai/schemas'
import { cloudSuggestions, EMPTY_FORM, fieldStatuses, fromForm, toForm } from '../src/features/triage/confirm'

// J's real S2 sample 4 output, adapted to the Session 3c schema.
const s4 = normalizeTriage(
  parseJson('{"incident_type":"ransomware","is_ransom_demand":true,"ransom_amount":500,"currency":"EUR","group_name":"CRYPTO","contact_method":"wallet","deadline":"3 days","file_extension":".crypt","confidence":"high"}', TriageRaw),
)

describe('prefill', () => {
  it('AI values prefill the form; nulls stay empty (never "unknown" or 0)', () => {
    const r = normalizeTriage(parseJson('{"incident_type":"tech_support_scam","is_ransom_demand":false,"contact_method":"+1 555 0100","confidence":"high"}', TriageRaw))
    expect(toForm(r)).toEqual({ ...EMPTY_FORM, incident_type: 'tech_support_scam', is_ransom_demand: 'no', contact_method: '+1 555 0100' })
  })
  it('no AI → empty form', () => expect(toForm(null)).toEqual(EMPTY_FORM))
})

describe('save', () => {
  it('trims, empty → null, amount → number ("25,000" → 25000)', () => {
    expect(fromForm({ ...EMPTY_FORM, ransom_amount: ' 25,000 ', currency: ' USD ', group_name: '  ' })).toMatchObject({ ransom_amount: 25000, currency: 'USD', group_name: null, incident_type: null, is_ransom_demand: null })
  })
  it('keeps an amount that is not a number as text (user typed what they saw)', () => expect(fromForm({ ...EMPTY_FORM, ransom_amount: '0.35 BTC' }).ransom_amount).toBe('0.35 BTC'))
})

describe('field status: what the AI read vs what the user confirmed', () => {
  it("J's sample 4 corrected by the user: invented group cleared, wallet and extension fixed", () => {
    const f = toForm(s4)
    const saved = fromForm({ ...f, group_name: '', contact_method: 'wallet bc1q-FAKE-TEST-WALLET-0000', file_extension: '.crypt7' })
    expect(fieldStatuses(s4, saved)).toEqual({
      incident_type: 'found',
      is_ransom_demand: 'found',
      ransom_amount: 'found',
      currency: 'found',
      group_name: 'edited',
      contact_method: 'edited',
      deadline: 'found',
      file_extension: 'edited',
    })
  })
  it('no AI: typed fields are "added", the rest "empty"', () => {
    const st = fieldStatuses(null, fromForm({ ...EMPTY_FORM, incident_type: 'ransomware', deadline: '72 hours' }))
    expect(st).toMatchObject({ incident_type: 'added', deadline: 'added', currency: 'empty', is_ransom_demand: 'empty' })
  })
})

describe('cloudSuggestions (cloud double-check never overwrites)', () => {
  const opened = { ...EMPTY_FORM, incident_type: 'ransomware' as const, currency: 'EUR', group_name: 'CRYPTO' }
  const cloud = { ...EMPTY_FORM, incident_type: 'ransomware' as const, currency: 'BTC', group_name: 'LockBit', deadline: '72 hours' }
  it('suggests only differing, non-empty cloud values on fields the user did not edit', () => {
    const current = { ...opened, group_name: 'my edit' }
    expect(cloudSuggestions(opened, current, cloud)).toEqual({ currency: 'BTC', deadline: '72 hours' })
  })
  it('no suggestion when the cloud agrees or found nothing', () => {
    expect(cloudSuggestions(opened, opened, { ...opened })).toEqual({})
    expect(cloudSuggestions(opened, opened, EMPTY_FORM)).toEqual({})
  })
})
