/**
 * #/incident/<id>: the plan for this incident, with every check stored in the
 * incident log (IndexedDB). Checks survive reloads and work offline.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type ReactNode } from 'react'
import { useI18n } from '../../i18n'
import { getPlan } from '../../plans'
import type { Plan, PlanStep } from '../../plans/schema'
import type { IncidentRecord } from '../../storage/db'
import { store } from '../../storage/localAdapter'
import { SourceBadge } from '../../ui/components'
import { IncidentLog } from '../log/IncidentLog'
import { PlanView } from './PlanView'

type Props = { id: string; stepExtras?: (step: PlanStep, incidentId: string, plan: Plan) => ReactNode; logExtras?: (record: IncidentRecord, plan: Plan) => ReactNode }

export function IncidentView({ id, stepExtras, logExtras }: Props) {
  const { lang, t } = useI18n()
  const record = useLiveQuery(async () => (await store.getIncident(id)) ?? null, [id])
  // Optimistic ticks: the box changes at once; the stored record catches up a few ms later.
  const [pending, setPending] = useState<Record<string, number | null>>({})
  if (record === undefined) return <p className="muted screen">{t('log.loading')}</p>
  if (record === null) return <p className="screen">{t('log.notFound')}</p>
  const plan = getPlan(lang, record.plan_id)
  if (!plan) return <p className="screen">{t('log.notFound')}</p>

  const started = record.events.find((e) => e.kind === 'started')
  const by = started?.kind === 'started' ? started.chosen_by : 'tile'
  const firstOpen = Math.max(0, plan.steps.findIndex((s) => !record.steps[s.id]))
  const steps: Record<string, number> = { ...record.steps }
  for (const [k, v] of Object.entries(pending)) {
    if (v === null) delete steps[k]
    else steps[k] = v
  }
  const toggle = (stepId: string, done: boolean) => {
    setPending((p) => ({ ...p, [stepId]: done ? Date.now() : null }))
    void store.setStep(record.id, stepId, done).finally(() =>
      setPending((p) => {
        const n = { ...p }
        delete n[stepId]
        return n
      }),
    )
  }

  return (
    <>
      <p className="chosen">
        {by !== 'tile' && <SourceBadge source={by} />} <span>{t(`plan.chosenBy.${by}`)}</span>{' '}
        {record.status === 'closed' && <span className="mono">{t('log.statusClosed')}</span>}
      </p>
      <PlanView
        key={`${record.id}:${lang}`}
        plan={plan}
        doneAt={steps}
        initialStep={firstOpen}
        onToggle={toggle}
        stepExtras={stepExtras ? (s) => stepExtras(s, record.id, plan) : undefined}
      />
      <IncidentLog record={record} plan={plan} extras={logExtras?.(record, plan)} />
    </>
  )
}
