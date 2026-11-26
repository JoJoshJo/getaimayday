/** Session 4 feature 1: keyword fallback + classify → plan mapping (no AI involved here). */
import { describe, expect, it } from 'vitest'
import { INCIDENT_TYPES } from '../src/ai/schemas'
import { keywordMatch } from '../src/features/home/keywords'
import { CLASSIFY_TO_INCIDENT, INCIDENTS } from '../src/plans/incidents'

const all = new Set(INCIDENTS)

describe('keywordMatch (no on-device AI)', () => {
  it.each([
    ['All the files on our office PC have a strange extension and there is a message asking for Bitcoin.', 'ransomware'],
    ['Tous nos fichiers sont chiffrés, on nous demande une rançon', 'ransomware'],
    ['Our supplier emailed new bank details for the invoice', 'bec'],
    ['Le fournisseur demande de payer la facture sur un nouveau compte', 'bec'],
    ['I clicked a link and typed my password', 'phishing'],
    ["J'ai cliqué sur un lien et donné mon mot de passe", 'phishing'],
    ['Someone stole the receptionist laptop', 'lost-device'],
    ['Internet is down since 9am, the router lights are red', 'outage'],
    ['Panne d’électricité au cabinet', 'outage'],
  ])('%s → %s', (text, want) => expect(keywordMatch(text, all)?.incident).toBe(want))

  it.each(['', '   ', 'help', 'something is weird'])('no clear hit for %j → null (tiles)', (t) => expect(keywordMatch(t, all)).toBeNull())

  it('a tie is not a guess', () => expect(keywordMatch('stolen password', all)).toBeNull())
  it('ignores incidents without a plan', () => expect(keywordMatch('invoice bank details', new Set(['ransomware'] as const))).toBeNull())
  it('matches word starts only ("down" inside "download" does not count)', () => expect(keywordMatch('please download the file', all)).toBeNull())
})

describe('classify → plan incident', () => {
  it('covers every classify answer', () => expect(Object.keys(CLASSIFY_TO_INCIDENT).sort()).toEqual([...INCIDENT_TYPES].sort()))
  it('unknown → tiles', () => expect(CLASSIFY_TO_INCIDENT.unknown).toBeNull())
  it('invoice fraud → BEC plan', () => expect(CLASSIFY_TO_INCIDENT.invoice_fraud).toBe('bec'))
})
