import { describe, expect, it } from 'vitest'
import { mentionedContacts } from '../src/features/contacts/mentions'

describe('mentionedContacts (Session 10: call buttons under answers)', () => {
  it('live bug: the ransom Pack answer names IT, insurer and police', () =>
    expect(mentionedContacts('Do not pay. Leave every decision to your IT contact, insurer and law enforcement.')).toEqual(['it_vendor', 'insurer', 'police']))
  it('live bug: the Wi-Fi fix-it answer says call your IT contact', () =>
    expect(mentionedContacts('If the lights stay red, call your IT contact.')).toEqual(['it_vendor']))
  it('the given role comes first, no duplicates', () =>
    expect(mentionedContacts('Call your bank, then your insurer and your IT provider.', 'insurer')).toEqual(['insurer', 'bank_fraud', 'it_vendor']))
  it('lowercase "it" is not the IT contact', () => expect(mentionedContacts('Turn it off and call it a day.')).toEqual([]))
  it('lawyer, attorney, staff lead, office manager', () => {
    expect(mentionedContacts('Ask a lawyer before you notify patients.')).toEqual(['lawyer'])
    expect(mentionedContacts('Tell your office manager.')).toEqual(['staff_lead'])
  })
  it('French', () => {
    expect(mentionedContacts('Laissez chaque décision à votre contact informatique, votre assureur et aux forces de l’ordre.')).toEqual(['it_vendor', 'insurer', 'police'])
    expect(mentionedContacts('Appelez votre banque et votre avocat.')).toEqual(['bank_fraud', 'lawyer'])
    expect(mentionedContacts('Prévenez le responsable du personnel.')).toEqual(['staff_lead'])
  })
  it('"assurez-vous" (make sure) is not the insurer', () => expect(mentionedContacts('Assurez-vous que le câble est branché.')).toEqual([]))
  it('nothing to call', () => expect(mentionedContacts('Unplug the router, wait 30 seconds, plug it back in.')).toEqual([]))
  it('no role and empty text', () => expect(mentionedContacts('', null)).toEqual([]))
})
