import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../storage/db'
import { store } from '../../storage/localAdapter'
import { ContactsSchema, ProfileSchema, type Contacts, type Profile } from './model'

/** Profile + contacts from IndexedDB (undefined while loading, null if not set or invalid). */
export function useSetup(): { profile: Profile | null | undefined; contacts: Contacts | null | undefined } {
  const rows = useLiveQuery(() => db.kv.bulkGet(['profile', 'contacts']), [])
  if (!rows) return { profile: undefined, contacts: undefined }
  const p = ProfileSchema.safeParse(rows[0]?.value)
  const c = ContactsSchema.safeParse(rows[1]?.value)
  return { profile: p.success ? p.data : null, contacts: c.success ? c.data : null }
}

export const saveProfile = (p: Profile) => store.setKv('profile', ProfileSchema.parse(p))
export const saveContacts = (c: Contacts) => store.setKv('contacts', ContactsSchema.parse(c))
