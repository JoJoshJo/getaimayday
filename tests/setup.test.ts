/** Session 4 feature 5: profile + contacts model. Fake data only. */
import { describe, expect, it } from 'vitest'
import { CONTACT_ROLES, ContactsSchema, EMPTY_PROFILE, ProfileSchema, SAMPLE_CONTACTS, SAMPLE_PROFILE, STEP_CONTACT, telHref } from '../src/features/setup/model'
import { rawPlans } from '../src/plans'

describe('profile + contacts', () => {
  it('fake sample data and the empty profile are valid', () => {
    expect(ProfileSchema.parse(SAMPLE_PROFILE)).toEqual(SAMPLE_PROFILE)
    expect(ProfileSchema.parse(EMPTY_PROFILE)).toEqual(EMPTY_PROFILE)
    expect(ContactsSchema.parse(SAMPLE_CONTACTS)).toEqual(SAMPLE_CONTACTS)
  })
  it('sample phone numbers are fictional 555-01xx numbers', () => {
    for (const c of Object.values(SAMPLE_CONTACTS)) expect(c!.phone).toMatch(/^555-01\d\d$/)
  })
  it('a partly filled contact list is valid (zod 4: partialRecord)', () => expect(ContactsSchema.safeParse({ it_vendor: SAMPLE_CONTACTS.it_vendor }).success).toBe(true))
  it('rejects unknown roles and fields', () => {
    expect(ContactsSchema.safeParse({ hacker: { name: 'x', phone: '', email: '', notes: '' } }).success).toBe(false)
    expect(ProfileSchema.safeParse({ ...EMPTY_PROFILE, ssn: '1' }).success).toBe(false)
  })
  it('tel: links keep digits and +', () => {
    expect(telHref('+1 (555) 010-0142')).toBe('tel:+15550100142')
    expect(telHref('555-0142')).toBe('tel:5550142')
  })
  it('every step → contact mapping points to a real step and role', () => {
    const stepIds = new Set(Object.values(rawPlans.en).flatMap((p) => (p as { steps: { id: string }[] }).steps.map((s) => s.id)))
    for (const [step, role] of Object.entries(STEP_CONTACT)) {
      expect(stepIds, step).toContain(step)
      expect(CONTACT_ROLES).toContain(role)
    }
  })
})
