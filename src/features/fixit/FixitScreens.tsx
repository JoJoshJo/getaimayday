/**
 * Everyday IT fix-its (NICE 15): Wi-Fi, email, frozen PC, printer, locked account,
 * power. Same step format as the incident plans (PlanView), with sources. Not an
 * incident: nothing is logged; ticks live only while the page is open. "Ask a
 * question" works here too (on-device AI, then the related plan's Pack answers).
 */
import { useState } from 'react'
import { useI18n } from '../../i18n'
import { getFixit, isFixitTopic } from '../../fixits'
import { FIXIT_TOPICS } from '../../fixits/schema'
import { StepAsk } from '../ask/StepAsk'
import { StepContacts } from '../contacts/StepContacts'
import { startIncident } from '../incident/start'
import { PlanView } from '../incident/PlanView'
import { FIXIT_ICON, ICON_STROKE } from '../../ui/icons'

export function FixitList() {
  const { t } = useI18n()
  return (
    <section className="fixits" aria-labelledby="fixit-title">
      <p className="kicker mono">{t('fixit.kicker')}</p>
      <h1 id="fixit-title" className="home__title">
        {t('fixit.title')}
      </h1>
      <p className="muted">{t('fixit.intro')}</p>
      <FixitTiles />
    </section>
  )
}

/** Tinted cards with an icon, like the incident tiles. `small` on Home: icon + title only. */
export function FixitTiles({ small = false }: { small?: boolean }) {
  const { t } = useI18n()
  return (
    <ul className={small ? 'tiles tiles--small' : 'tiles'}>
      {FIXIT_TOPICS.map((id) => {
        const Icon = FIXIT_ICON[id]
        return (
        <li key={id}>
          <a className="tile" data-tone="fixit" href={`#/fixit/${id}`}>
            <Icon className="tile__icon" aria-hidden="true" strokeWidth={ICON_STROKE} />
            <span className="tile__title">{t(`fixit.topic.${id}`)}</span>
            <span className="tile__desc">{t(`fixit.desc.${id}`)}</span>
            <span className="tile__go mono" aria-hidden="true">
              →
            </span>
          </a>
        </li>
        )
      })}
    </ul>
  )
}

export function FixitView({ id }: { id: string }) {
  const { t, lang } = useI18n()
  const [doneAt, setDoneAt] = useState<Record<string, number>>({})
  const fixit = isFixitTopic(id) ? getFixit(lang, id) : undefined

  if (!fixit) {
    return (
      <section>
        <p>{t('fixit.notFound')}</p>
        <a href="#/fixit">{t('fixit.all')}</a>
      </section>
    )
  }

  const guide = { ...fixit, packPlan: fixit.related ?? null }
  const toggle = (stepId: string, done: boolean) =>
    setDoneAt((d) => {
      const next = { ...d }
      if (done) next[stepId] = Date.now()
      else delete next[stepId]
      return next
    })

  return (
    <div className="fixit">
      <p className="home__more">
        <a href="#/fixit">{t('fixit.all')}</a>
      </p>
      <PlanView
        key={`${fixit.id}-${lang}`}
        plan={fixit}
        tone="fixit"
        icon={FIXIT_ICON[fixit.topic]}
        title={t(`fixit.topic.${fixit.topic}`)}
        kicker={t('fixit.kickerShort')}
        doneAt={doneAt}
        onToggle={toggle}
        stepExtras={(step) => (
          <>
            <StepContacts step={step} />
            <StepAsk key={step.id} plan={guide} step={step} />
          </>
        )}
      />
      {fixit.related && (
        <section className="fixit__attack" aria-labelledby="fixit-attack">
          <h2 id="fixit-attack" className="mono log__title">
            {t('fixit.attackTitle')}
          </h2>
          <p className="muted">{t('fixit.attackText')}</p>
          <button type="button" className="btn" onClick={() => void startIncident(fixit.related!, 'tile')}>
            {t('fixit.openPlan', { plan: t(`incident.${fixit.related}`) })}
          </button>
        </section>
      )}
    </div>
  )
}
