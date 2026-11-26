/**
 * Demo mode for filming (Session 5): FAKE business data in one click, and a
 * full local reset. Reached only through the hidden #/demo-setup route; never on
 * by default. While demo data is loaded, every screen shows a "Demo data" line.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../storage/db'
import { store } from '../../storage/localAdapter'
import { SAMPLE_CONTACTS, SAMPLE_PROFILE } from '../setup/model'
import { saveContacts, saveProfile } from '../setup/useSetup'

export const DEMO_KEY = 'demo'

/** Sunrise Dental, Riverdale GA, 6 staff, 555-01xx contacts. All invented. */
export async function loadDemo(now = Date.now()): Promise<void> {
  await saveProfile(SAMPLE_PROFILE)
  await saveContacts(SAMPLE_CONTACTS)
  await store.setKv(DEMO_KEY, { loaded_at: now })
}

/** Deletes everything this app stored on the device: incidents, photos, profile, contacts, Pack, settings, language. */
export async function resetAll(): Promise<void> {
  await db.delete()
  try {
    localStorage.removeItem('aimayday.lang')
  } catch {
    // storage may be blocked; nothing else to clear
  }
}

/** True while demo data is loaded (shows the "Demo data" line). */
export function useDemo(): boolean {
  return !!useLiveQuery(async () => !!(await db.kv.get(DEMO_KEY)), [], false)
}
