/**
 * Business profile + emergency contacts (MASTER §8). Stored locally (kv table).
 * Validated with zod on read and write. Also the input of the Offline Pack.
 */
import { z } from 'zod'

export const BUSINESS_TYPES = ['health', 'retail', 'food', 'office', 'trades', 'other'] as const
export const COUNTRIES = ['US', 'CA', 'FR', 'other'] as const
export const BACKUPS = ['yes', 'no', 'unsure'] as const

const txt = (max: number) => z.string().trim().max(max)

export const ProfileSchema = z
  .object({
    name: txt(120),
    type: z.enum(BUSINESS_TYPES),
    city: txt(120),
    country: z.enum(COUNTRIES),
    staff: txt(20),
    email_provider: txt(120),
    key_systems: txt(400),
    backups: z.enum(BACKUPS),
    backups_where: txt(200),
  })
  .strict()
export type Profile = z.infer<typeof ProfileSchema>

export const EMPTY_PROFILE: Profile = { name: '', type: 'office', city: '', country: 'US', staff: '', email_provider: '', key_systems: '', backups: 'unsure', backups_where: '' }

export const CONTACT_ROLES = ['it_vendor', 'bank_fraud', 'insurer', 'lawyer', 'police', 'staff_lead'] as const
export type ContactRole = (typeof CONTACT_ROLES)[number]

export const ContactSchema = z.object({ name: txt(120), phone: txt(40), email: txt(160), notes: txt(300) }).strict()
export type Contact = z.infer<typeof ContactSchema>
export const ContactsSchema = z.partialRecord(z.enum(CONTACT_ROLES), ContactSchema)
export type Contacts = Partial<Record<ContactRole, Contact>>

export const EMPTY_CONTACT: Contact = { name: '', phone: '', email: '', notes: '' }

/** Fixed, public links shown on the card (not editable). */
export const FIXED_LINKS = [{ key: 'ic3', url: 'https://www.ic3.gov/' }] as const

/** Plan step → the contact the step tells you to call (one-tap button on that step). */
export const STEP_CONTACT: Record<string, ContactRole> = {
  'call-it-contact': 'it_vendor',
  'restore-with-it': 'it_vendor',
  'check-email-rules': 'it_vendor',
  'call-insurer': 'insurer',
  'call-bank-now': 'bank_fraud',
  'tell-staff': 'staff_lead',
  'warn-payers': 'staff_lead',
  'report-police': 'police',
  'check-customer-data': 'lawyer',
}

export const hasContact = (c?: Contact) => !!c && (c.phone.trim() !== '' || c.email.trim() !== '' || c.name.trim() !== '')

/** "+1 (555) 010-0142" → "+15550100142" for tel: links. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

/** FAKE sample data for dev and tests only (MASTER: never real business data). */
export const SAMPLE_PROFILE: Profile = {
  name: 'Sunrise Dental',
  type: 'health',
  city: 'Riverdale, GA',
  country: 'US',
  staff: '8',
  email_provider: 'Microsoft 365',
  key_systems: 'Patient records (Dentrix), card reader at the front desk, shared drive on the office server',
  backups: 'yes',
  backups_where: 'USB drive in the back office, taken home on Fridays',
}
export const SAMPLE_CONTACTS: Contacts = {
  it_vendor: { name: 'Riverdale IT Services, Sam', phone: '555-0142', email: 'help@riverdale-it.example', notes: 'After hours: same number, press 2' },
  bank_fraud: { name: 'First Peach Bank, fraud line', phone: '555-0177', email: '', notes: 'Account ending 0000' },
  insurer: { name: 'Magnolia Mutual, claims', phone: '555-0163', email: 'claims@magnolia.example', notes: 'Policy CY-000-TEST' },
  lawyer: { name: 'Dana Ortiz', phone: '555-0128', email: '', notes: '' },
  police: { name: 'Riverdale police, non-emergency', phone: '555-0110', email: '', notes: '' },
  staff_lead: { name: 'Pat Kim, office manager', phone: '555-0185', email: '', notes: '' },
}
