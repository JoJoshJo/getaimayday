import { useState } from 'react'
import { useI18n } from '../../i18n'
import type { Plan, PlanStep } from '../../plans/schema'

type Props = { plan: Plan }

// Check state is in memory for now; the incident log (MASTER.md §6 #5) will persist it.
export function PlanView({ plan }: Props) {
  const { t } = useI18n()
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [current, setCurrent] = useState(0)
  const [showAll, setShowAll] = useState(false)

  const total = plan.steps.length
  const doneCount = plan.steps.filter((s) => done[s.id]).length
  const toggle = (id: string) => setDone((d) => ({ ...d, [id]: !d[id] }))

  const visible = showAll ? plan.steps.map((s, i) => [s, i] as const) : [[plan.steps[current], current] as const]

  return (
    <section aria-labelledby="plan-title">
      <header className="plan-header">
        <h2 id="plan-title">{t('plan.heading', { incident: t(`incident.${plan.incident}` as 'incident.ransomware') })}</h2>
        <div aria-live="polite">{t('plan.progress', { done: doneCount, total })}</div>
        <progress className="progress" max={total} value={doneCount} />
      </header>

      <div className="toolbar">
        {!showAll && (
          <>
            <button className="btn" onClick={() => setCurrent((c) => c - 1)} disabled={current === 0}>
              ← {t('plan.prev')}
            </button>
            <button className="btn btn-primary" onClick={() => setCurrent((c) => c + 1)} disabled={current === total - 1}>
              {t('plan.next')} →
            </button>
          </>
        )}
        <button className="btn" onClick={() => setShowAll((v) => !v)} aria-pressed={showAll}>
          {showAll ? t('plan.viewOne') : t('plan.viewAll')}
        </button>
      </div>

      <ol className="steps">
        {visible.map(([step, i]) => (
          <StepCard key={step.id} step={step} index={i} total={total} done={!!done[step.id]} onToggle={() => toggle(step.id)} />
        ))}
      </ol>

      {doneCount === total && <p className="all-done">{t('plan.allDone')}</p>}
    </section>
  )
}

type StepProps = { step: PlanStep; index: number; total: number; done: boolean; onToggle: () => void }

function StepCard({ step, index, total, done, onToggle }: StepProps) {
  const { t } = useI18n()
  return (
    <li className={`step${done ? ' is-done' : ''}`}>
      <div className="step-num">{t('plan.stepOf', { n: index + 1, total })}</div>
      <label className="step-check">
        <input type="checkbox" checked={done} onChange={onToggle} aria-describedby={`detail-${step.id}`} />
        <span className="step-title">{step.title}</span>
      </label>
      <p id={`detail-${step.id}`}>{step.detail}</p>
      {step.do_not && (
        <p className="do-not">
          <span className="label">{t('plan.doNot')}: </span>
          {step.do_not}
        </p>
      )}
      <p>
        <span className="label">{t('plan.why')}: </span>
        {step.why}
      </p>
      <p className="source">
        {t('plan.source')}:{' '}
        <a href={step.source_url} target="_blank" rel="noopener noreferrer">
          {step.source_name}
        </a>
      </p>
    </li>
  )
}
