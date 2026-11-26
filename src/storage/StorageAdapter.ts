/**
 * Storage boundary (MASTER §5 folder plan). The app talks to this interface only;
 * `localAdapter` (IndexedDB) is the default. An opt-in cloud adapter (NICE #18,
 * Firestore with offline persistence) can implement the same interface later.
 */
import type { ChosenBy, IncidentRecord, LogEvent, PhotoRecord } from './db'
import type { Incident } from '../plans/schema'

/** A LogEvent without its timestamp: the adapter stamps it. */
export type NewEvent = LogEvent extends infer E ? (E extends LogEvent ? Omit<E, 'at'> : never) : never

export interface StorageAdapter {
  startIncident(input: { incident: Incident; plan_id: string; plan_version: string; chosen_by: ChosenBy }): Promise<IncidentRecord>
  getIncident(id: string): Promise<IncidentRecord | undefined>
  listIncidents(): Promise<IncidentRecord[]>
  /** Check / uncheck a step. Checking stamps the time; both are logged. */
  setStep(id: string, stepId: string, done: boolean): Promise<void>
  addEvent(id: string, event: NewEvent): Promise<void>
  addPhoto(id: string, file: Blob, name: string): Promise<PhotoRecord>
  getPhoto(photoId: string): Promise<PhotoRecord | undefined>
  setStatus(id: string, status: 'open' | 'closed'): Promise<void>
  getKv<T>(key: string): Promise<T | undefined>
  setKv(key: string, value: unknown): Promise<void>
}
