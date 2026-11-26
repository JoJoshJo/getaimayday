/** Demo setup (Session 5): fake data in one click, full local reset. */
import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { DEMO_KEY, loadDemo, resetAll } from '../src/features/demo/demo'
import { SAMPLE_CONTACTS, SAMPLE_PROFILE } from '../src/features/setup/model'
import { db } from '../src/storage/db'
import { store } from '../src/storage/localAdapter'

describe('demo data', () => {
  it('is the fake Sunrise Dental, Riverdale GA, 6 staff, 555-01xx', () => {
    expect(SAMPLE_PROFILE).toMatchObject({ name: 'Sunrise Dental', city: 'Riverdale, GA', staff: '6' })
    for (const c of Object.values(SAMPLE_CONTACTS)) if (c.phone) expect(c.phone).toMatch(/^555-01\d\d$/)
  })
  it('loads profile, contacts and the demo flag', async () => {
    await loadDemo(5)
    expect(await store.getKv('profile')).toMatchObject({ name: 'Sunrise Dental' })
    expect(await store.getKv('contacts')).toMatchObject({ it_vendor: { phone: '555-0142' } })
    expect(await store.getKv(DEMO_KEY)).toEqual({ loaded_at: 5 })
  })
  it('reset deletes every local record', async () => {
    await loadDemo()
    const r = await store.startIncident({ incident: 'ransomware', plan_id: 'ransomware', plan_version: '1.1.0', chosen_by: 'tile' })
    expect(r.id).toBeTruthy()
    await resetAll()
    await db.open()
    expect(await db.kv.count()).toBe(0)
    expect(await db.incidents.count()).toBe(0)
    expect(await db.photos.count()).toBe(0)
  })
})
