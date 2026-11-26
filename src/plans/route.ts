/**
 * Session 3c: what the app opens after photo triage (MASTER §6 MUST #6).
 *
 *   ransomware        → ransomware plan
 *   tech_support_scam → phishing / stolen-password plan for now
 *                       (candidate for its own plan later: MASTER §6 / §17)
 *   phishing_page     → phishing / stolen-password plan
 *   other             → incident tiles (the user picks)
 *   not_an_incident   → incident tiles (the user picks)
 *
 * If the target plan isn't written yet (phishing is SHOULD #13), the user gets
 * the tiles instead of a dead end. The user's confirmation in the
 * found-on-screen panel always comes first (DESIGN.md §6).
 */
import type { TriageType } from '../ai/schemas'
import { incidentsWithPlan } from './incidents'
import type { Incident as PlanIncident } from './schema'

export type { PlanIncident }

export type TriageRoute =
  | { kind: 'plan'; incident: PlanIncident }
  | { kind: 'tiles'; reason: 'not-sure' | 'no-plan-yet'; wanted?: PlanIncident }

export const TRIAGE_TO_INCIDENT: Record<TriageType, PlanIncident | null> = {
  ransomware: 'ransomware',
  tech_support_scam: 'phishing',
  phishing_page: 'phishing',
  other: null,
  not_an_incident: null,
}

export function routeTriage(type: TriageType, available: Set<string> = incidentsWithPlan()): TriageRoute {
  const incident = TRIAGE_TO_INCIDENT[type]
  if (!incident) return { kind: 'tiles', reason: 'not-sure' }
  if (!available.has(incident)) return { kind: 'tiles', reason: 'no-plan-yet', wanted: incident }
  return { kind: 'plan', incident }
}
