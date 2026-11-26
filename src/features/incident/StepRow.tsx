import { ExternalLink } from 'lucide-react'
import { forwardRef, type ReactNode } from 'react'
import { useI18n } from '../../i18n'
import type { PlanStep } from '../../plans/schema'
import { DoNot, Stamp } from '../../ui/components'

export type StepState = 'todo' | 'current' | 'done'

type Props = {
  step: PlanStep
  index: number
  total: number
  state: StepState
  doneAt?: Date
  onToggle: () => void
  extras?: ReactNode
}

/** One QRH-style step: huge number in the left margin, square checkbox, action, details, footnotes. */
export const StepRow = forwardRef<HTMLElement, Props>(function StepRow({ step, index, total, state, doneAt, onToggle, extras }, ref) {
  const { t } = useI18n()
  const n = String(index + 1).padStart(2, '0')
  const checked = state === 'done'
  const titleId = `step-title-${step.id}`
  const markId = `step-mark-${step.id}`

  return (
    <article ref={ref} tabIndex={-1} className={`step step--${state}`} aria-labelledby={titleId} aria-current={state === 'current' ? 'step' : undefined}>
      <div className="step__num" aria-hidden="true">
        {n}
      </div>

      <div className="step__body">
        <div className="step__meta mono">{t('plan.stepOf', { n: index + 1, total })}</div>

        <div className="step__action">
          <h3 id={titleId} className="step__title">
            {step.title}
          </h3>
        </div>

        {/* Session 11: a visible "Mark done" label so the round check reads as a control.
            Its name keeps the visible words first (WCAG 2.5.3), then the step title. */}
        <div className="step__mark">
          <label className="check">
            <input type="checkbox" name={`step-${step.id}`} checked={checked} onChange={onToggle} aria-labelledby={`${markId} ${titleId}`} aria-describedby={`step-detail-${step.id}`} />
            <span className="check__box" aria-hidden="true" />
            <span id={markId} className="check__text">
              {checked ? t('plan.markDone') : t('plan.markTodo')}
            </span>
          </label>
          {checked && doneAt && <Stamp at={doneAt} />}
        </div>

        <p id={`step-detail-${step.id}`} className="step__detail">
          {step.detail}
        </p>

        {step.do_not && <DoNot>{step.do_not}</DoNot>}

        {extras && <div className="step__extras">{extras}</div>}

        <dl className="notes">
          <div className="notes__row">
            <dt className="mono">{t('plan.why')}</dt>
            <dd>{step.why}</dd>
          </div>
          <div className="notes__row">
            <dt className="mono">{t('plan.source')}</dt>
            <dd>
              <a className="mono notes__src" href={step.source_url} target="_blank" rel="noopener noreferrer">
                {step.source_name} <ExternalLink className="inline-icon" aria-hidden="true" size={15} strokeWidth={1.75} />
              </a>
            </dd>
          </div>
        </dl>
      </div>
    </article>
  )
})
