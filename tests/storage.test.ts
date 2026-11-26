/** Session 4 feature 2: incident log in IndexedDB (fake-indexeddb in Node). */
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { AimDB } from '../src/storage/db'
import { createLocalAdapter } from '../src/storage/localAdapter'

let t = 1_000
let db: AimDB
const mk = () => createLocalAdapter(db, () => (t += 1000))

beforeEach(async () => {
  db = new AimDB(`test-${Math.random()}`)
  t = 1_000
})

describe('incident log', () => {
  it('starts an incident with a timestamped "started" event', async () => {
    const s = mk()
    const r = await s.startIncident({ incident: 'ransomware', plan_id: 'ransomware', plan_version: '1.0.0', chosen_by: 'checklist' })
    expect(r).toMatchObject({ incident: 'ransomware', status: 'open', steps: {}, started_at: 2000 })
    expect(r.events).toEqual([{ at: 2000, kind: 'started', chosen_by: 'checklist' }])
  })

  it('auto-timestamps checked steps, persists them, and logs unchecks too', async () => {
    const s = mk()
    const { id } = await s.startIncident({ incident: 'ransomware', plan_id: 'ransomware', plan_version: '1.0.0', chosen_by: 'tile' })
    await s.setStep(id, 'disconnect-network', true)
    await s.setStep(id, 'use-clean-device', true)
    await s.setStep(id, 'use-clean-device', false)
    // a NEW adapter on the same database = a page reload
    const r = await createLocalAdapter(db).getIncident(id)
    expect(r?.steps).toEqual({ 'disconnect-network': 3000 })
    expect(r?.events.map((e) => e.kind === 'step' && `${e.step_id}:${e.done}@${e.at}`).filter(Boolean)).toEqual([
      'disconnect-network:true@3000',
      'use-clean-device:true@4000',
      'use-clean-device:false@5000',
    ])
  })

  it('notes, photos, close/reopen', async () => {
    const s = mk()
    const { id } = await s.startIncident({ incident: 'bec', plan_id: 'bec', plan_version: '1.0.0', chosen_by: 'tile' })
    await s.addEvent(id, { kind: 'note', text: 'Called Riverdale IT (555-0142), they are on their way.' })
    const photo = await s.addPhoto(id, new Blob(['fake'], { type: 'image/png' }), 'screen.png')
    expect((await s.getPhoto(photo.id))?.mime).toBe('image/png')
    await s.setStatus(id, 'closed')
    await s.setStatus(id, 'open')
    const r = await s.getIncident(id)
    expect(r?.events.map((e) => e.kind)).toEqual(['started', 'note', 'photo', 'closed', 'reopened'])
    expect(r?.status).toBe('open')
  })

  it('lists incidents newest first', async () => {
    const s = mk()
    await s.startIncident({ incident: 'outage', plan_id: 'outage', plan_version: '1.0.0', chosen_by: 'tile' })
    await s.startIncident({ incident: 'ransomware', plan_id: 'ransomware', plan_version: '1.0.0', chosen_by: 'tile' })
    expect((await s.listIncidents()).map((r) => r.incident)).toEqual(['ransomware', 'outage'])
  })

  it('key-value records (profile, contacts, pack)', async () => {
    const s = mk()
    await s.setKv('profile', { name: 'Sunrise Dental' })
    expect(await s.getKv('profile')).toEqual({ name: 'Sunrise Dental' })
    expect(await s.getKv('missing')).toBeUndefined()
  })

  it('refuses events for an unknown incident', async () => {
    await expect(mk().addEvent('nope', { kind: 'note', text: 'x' })).rejects.toThrow()
  })
})
