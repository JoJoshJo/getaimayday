/**
 * Local database (MASTER §8): IndexedDB via Dexie. Everything stays on the device.
 *
 *   incidents  one record per incident, with its full event log
 *   photos     photo blobs (kept apart so incident lists stay light)
 *   kv         single records: profile, contacts, pack, settings
 *
 * Schema changes: add a new `this.version(n)` block, never edit an old one.
 */
import Dexie, { type Table } from 'dexie'
import type { Confidence } from '../ai/schemas'
import type { Source } from '../ai/router'
import type { Incident } from '../plans/schema'

/** How the plan was chosen: a real AI source, keyword match ("checklist") or the user's tap. */
export type ChosenBy = Source | 'tile'

export type TriageFieldName = 'incident_type' | 'is_ransom_demand' | 'ransom_amount' | 'currency' | 'group_name' | 'contact_method' | 'deadline' | 'file_extension'
/** found = AI value kept as is; edited = user changed it; added = AI had nothing, user typed it; empty = nothing. */
export type FieldStatus = 'found' | 'edited' | 'added' | 'empty'

export type LogEvent = { at: number } & (
  | { kind: 'started'; chosen_by: ChosenBy }
  | { kind: 'step'; step_id: string; done: boolean }
  | { kind: 'note'; text: string }
  | { kind: 'photo'; photo_id: string }
  | {
      kind: 'triage'
      photo_id: string
      source: Source
      confidence: Confidence | null
      fields: Record<TriageFieldName, string | number | boolean | null>
      status: Record<TriageFieldName, FieldStatus>
      cloud_checked?: boolean
    }
  | { kind: 'ai'; job: string; source: Source; question?: string; text?: string; model?: string }
  | { kind: 'closed' }
  | { kind: 'reopened' }
)

export type IncidentRecord = {
  id: string
  incident: Incident
  plan_id: string
  plan_version: string
  started_at: number
  status: 'open' | 'closed'
  /** step id → time it was checked (ms). Unchecked steps are absent. */
  steps: Record<string, number>
  events: LogEvent[]
}

export type PhotoRecord = { id: string; incident_id: string; at: number; name: string; mime: string; blob: Blob }

export type KvRecord = { key: string; value: unknown; updated_at: number }

export class AimDB extends Dexie {
  incidents!: Table<IncidentRecord, string>
  photos!: Table<PhotoRecord, string>
  kv!: Table<KvRecord, string>

  constructor(name = 'aimayday') {
    super(name)
    this.version(1).stores({
      incidents: 'id, started_at, status',
      photos: 'id, incident_id',
      kv: 'key',
    })
  }
}

export const db = new AimDB()

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
