import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../../i18n'
import type { PlanStep } from '../../plans/schema'
import { Progress } from '../../ui/components'
import { ICON_STROKE } from '../../ui/icons'
import type { Tone } from '../../ui/tokens'
import { StepRow, type StepState } from './StepRow'

/** Anything with versioned steps: an incident plan or an IT fix-it. */
export type StepGuide = { id: string; version: string; steps: PlanStep[] }

type Props = {
  plan: StepGuide
  /** Big title (incident name or fix-it name). */
  title: string
  /** Kicker above the title; defaults to "Incident plan". The version is in the footer (Session 11). */
  kicker?: string
  /** step id → time checked (ms). Owned by the incident log (IndexedDB). */
  doneAt: Record<string, number>
  onToggle: (stepId: string, done: boolean) => void
  /** Extra controls under each step (contacts, ask a question). */
  stepExtras?: (step: PlanStep) => ReactNode
  /** Start on this step (e.g. the first unchecked one when resuming). */
  initialStep?: number
  /** Calm colour of this incident (or "fixit") and its icon (DESIGN.md §2 tints). */
  tone?: Tone
  icon?: LucideIcon
}

export function PlanView({ plan, title, kicker, doneAt, onToggle, stepExtras, initialStep = 0, tone, icon: Icon }: Props) {
  const { t } = useI18n()
  const [view, setView] = useState(initialStep)
  const [showAll, setShowAll] = useState(false)
  const stepRef = useRef<HTMLElement>(null)
  const navigated = useRef(false)

  const total = plan.steps.length
  const isDone = (id: string) => !!doneAt[id]
  const firstOpen = plan.steps.findIndex((s) => !isDone(s.id))
  const currentIdx = showAll ? firstOpen : view
  const stateOf = (i: number): StepState => (isDone(plan.steps[i].id) ? 'done' : i === currentIdx ? 'current' : 'todo')
  const states = plan.steps.map((_, i) => stateOf(i))
  const doneCount = states.filter((s) => s === 'done').length

  const toggle = (id: string) => onToggle(id, !isDone(id))
  const go = (i: number) => {
    navigated.current = true
    setView(Math.max(0, Math.min(total - 1, i)))
  }

  // Keyboard: ←/→ move between steps in one-step view.
  useEffect(() => {
    if (showAll) return
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      const el = e.target as HTMLElement
      if (el.isContentEditable || ['TEXTAREA', 'SELECT'].includes(el.tagName) || (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'text')) return
      if (e.key === 'ArrowRight') go(view + 1)
      else if (e.key === 'ArrowLeft') go(view - 1)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Move focus to the new step after prev/next so screen readers and keyboard users follow.
  useEffect(() => {
    if (navigated.current) stepRef.current?.focus()
    navigated.current = false
  }, [view])

  const rows = showAll ? plan.steps.map((_, i) => i) : [view]

  return (
    <section className="plan" data-tone={tone} aria-labelledby="plan-title">
      <header className="plan__head">
        {Icon && <Icon className="plan__icon" aria-hidden="true" strokeWidth={ICON_STROKE} />}
        <p className="kicker mono">{kicker ?? t('plan.kickerShort')}</p>
        <h2 id="plan-title" className="plan__title">
          {title}
        </h2>
        <Progress states={states} label={t('plan.progress', { done: doneCount, total })} />
      </header>

      <div className="toolbar">
        {!showAll && (
          <>
            <button type="button" className="btn" onClick={() => go(view - 1)} disabled={view === 0}>
              <ArrowLeft className="inline-icon" aria-hidden="true" size={18} strokeWidth={1.75} /> {t('plan.prev')}
            </button>
            <button type="button" className="btn btn--strong" onClick={() => go(view + 1)} disabled={view === total - 1}>
              {t('plan.next')} <ArrowRight className="inline-icon" aria-hidden="true" size={18} strokeWidth={1.75} />
            </button>
          </>
        )}
        <button type="button" className="btn btn--quiet" onClick={() => setShowAll((v) => !v)} aria-pressed={showAll}>
          {showAll ? t('plan.viewOne') : t('plan.viewAll')}
        </button>
      </div>

      <div className="steps">
        {rows.map((i) => {
          const s = plan.steps[i]
          return (
            <StepRow
              key={s.id}
              ref={!showAll ? stepRef : undefined}
              step={s}
              index={i}
              total={total}
              state={states[i]}
              doneAt={doneAt[s.id] ? new Date(doneAt[s.id]) : undefined}
              onToggle={() => toggle(s.id)}
              extras={stepExtras?.(s)}
            />
          )
        })}
      </div>

      {!showAll && <p className="hint">{t('plan.keys')}</p>}
      {doneCount === total && <p className="all-done">{t('plan.allDone')}</p>}
      <p className="plan__version">{t('plan.version', { version: plan.version })}</p>
    </section>
  )
}
