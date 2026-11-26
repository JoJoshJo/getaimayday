/** Default storage: IndexedDB (Dexie). Works offline, never leaves the device. */
import { db as defaultDb, newId, type AimDB, type IncidentRecord, type LogEvent, type PhotoRecord } from './db'
import type { StorageAdapter } from './StorageAdapter'

export function createLocalAdapter(db: AimDB = defaultDb, now: () => number = Date.now): StorageAdapter {
  const push = (id: string, event: LogEvent, change?: (r: IncidentRecord) => void) =>
    db.transaction('rw', db.incidents, async () => {
      const r = await db.incidents.get(id)
      if (!r) throw new Error(`No incident ${id}`)
      change?.(r)
      r.events.push(event)
      await db.incidents.put(r)
    })

  return {
    async startIncident({ incident, plan_id, plan_version, chosen_by }) {
      const at = now()
      const r: IncidentRecord = { id: newId(), incident, plan_id, plan_version, started_at: at, status: 'open', steps: {}, events: [{ at, kind: 'started', chosen_by }] }
      await db.incidents.add(r)
      return r
    },
    getIncident: (id) => db.incidents.get(id),
    listIncidents: () => db.incidents.orderBy('started_at').reverse().toArray(),
    async setStep(id, stepId, done) {
      const at = now()
      await push(id, { at, kind: 'step', step_id: stepId, done }, (r) => {
        if (done) r.steps[stepId] = at
        else delete r.steps[stepId]
      })
    },
    addEvent: (id, event) => push(id, { ...event, at: now() } as LogEvent),
    async addPhoto(id, file, name) {
      const p: PhotoRecord = { id: newId(), incident_id: id, at: now(), name, mime: file.type, blob: file }
      await db.transaction('rw', db.photos, db.incidents, async () => {
        await db.photos.add(p)
        await push(id, { at: p.at, kind: 'photo', photo_id: p.id })
      })
      return p
    },
    getPhoto: (photoId) => db.photos.get(photoId),
    async setStatus(id, status) {
      await push(id, { at: now(), kind: status === 'closed' ? 'closed' : 'reopened' }, (r) => {
        r.status = status
      })
    },
    getKv: async <T,>(key: string) => (await db.kv.get(key))?.value as T | undefined,
    setKv: async (key, value) => {
      await db.kv.put({ key, value, updated_at: now() })
    },
  }
}

export const store: StorageAdapter = createLocalAdapter()
