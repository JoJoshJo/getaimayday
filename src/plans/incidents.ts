/**
 * Incident types the app knows, and how AI answers map to them.
 * Plan incidents (src/plans/schema.ts INCIDENTS) are what the user sees.
 * classifyIncident has its own enum (src/ai/schemas.ts INCIDENT_TYPES, S1-tested).
 */
import type { IncidentType } from '../ai/schemas'
import { rawPlans } from '.'
import { INCIDENTS, type Incident } from './schema'

export { INCIDENTS, type Incident }

/** classify answer → plan incident. "unknown" → null → show the tiles. */
export const CLASSIFY_TO_INCIDENT: Record<IncidentType, Incident | null> = {
  ransomware: 'ransomware',
  phishing: 'phishing',
  invoice_fraud: 'bec',
  lost_device: 'lost-device',
  outage: 'outage',
  unknown: null,
}

/** Incidents that have a built-in plan (any language; the plans test enforces EN + FR). */
export function incidentsWithPlan(): Set<Incident> {
  const out = new Set<Incident>()
  for (const byId of Object.values(rawPlans)) for (const p of Object.values(byId)) out.add((p as { incident: Incident }).incident)
  return out
}

/** Plan id for an incident (plans are named after their incident). */
export function planIdFor(incident: Incident): string {
  for (const byId of Object.values(rawPlans))
    for (const [id, p] of Object.entries(byId)) if ((p as { incident: Incident }).incident === incident) return id
  return incident
}

export const isIncident = (v: string | undefined): v is Incident => !!v && (INCIDENTS as readonly string[]).includes(v)
