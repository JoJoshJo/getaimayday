/**
 * Which saved contacts an answer tells the user to reach (Session 10).
 * Pack answers carry one `contact_role`, but AI answers are free text and a Pack answer
 * can name several people ("leave every decision to your IT contact, insurer and law
 * enforcement"), so the text is read too. EN + FR.
 * Order: the given role first, then the order the text mentions them.
 */
import { CONTACT_ROLES, type ContactRole } from '../setup/model'

const MENTIONS: Record<ContactRole, RegExp[]> = {
  it_vendor: [
    // "IT" in capitals only, so "call it back" is not the IT contact.
    /\bIT\s+(contacts?|providers?|person|vendors?|support|company|team|helpdesk|help|services?|partners?)\b/u,
    /\b(contacts?|prestataires?|support|services?|techniciens?|responsables?|partenaires?)\s+informatiques?\b|\binformaticien(ne)?s?\b/iu,
  ],
  bank_fraud: [/\b(banks?|banques?)\b/iu],
  insurer: [/\b(insurers?|insurance|assureurs?|assurances?)\b/iu],
  lawyer: [/\b(lawyers?|attorneys?|legal counsel|avocat(e)?s?|juristes?)\b/iu],
  police: [/\b(police|law enforcement|gendarmerie)\b|forces de l['’]ordre/iu],
  staff_lead: [/\b(staff lead|office manager|responsable du personnel)\b/iu],
}

function firstIndex(role: ContactRole, text: string): number {
  const hits = MENTIONS[role].map((re) => text.search(re)).filter((i) => i >= 0)
  return hits.length ? Math.min(...hits) : -1
}

export function mentionedContacts(text: string, first?: ContactRole | null): ContactRole[] {
  const found = CONTACT_ROLES.map((r) => [r, firstIndex(r, text)] as const)
    .filter(([, i]) => i >= 0)
    .sort((a, b) => a[1] - b[1])
    .map(([r]) => r)
  return first ? [first, ...found.filter((r) => r !== first)] : found
}
