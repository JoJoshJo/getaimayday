import { navigate } from '../../app/router'
import { getPlan } from '../../plans'
import { planIdFor, type Incident } from '../../plans/incidents'
import type { ChosenBy } from '../../storage/db'
import { store } from '../../storage/localAdapter'

/** Start a new incident with the plan for `incident` and open it. */
export async function startIncident(incident: Incident, chosenBy: ChosenBy): Promise<void> {
  const planId = planIdFor(incident)
  const plan = getPlan('en', planId)
  const r = await store.startIncident({ incident, plan_id: planId, plan_version: plan?.version ?? '0.0.0', chosen_by: chosenBy })
  navigate(`/incident/${r.id}`)
}
