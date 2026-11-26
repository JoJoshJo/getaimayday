/**
 * #/print: the contacts card, every incident plan with every step, then the
 * everyday IT fix-its (Session 7), for paper. The last line of defence when no
 * device works. Printing is recorded for the Get ready checklist.
 */
import { useI18n } from '../../i18n'
import { getFixit } from '../../fixits'
import { FIXIT_TOPICS } from '../../fixits/schema'
import { getPlan, rawPlans } from '../../plans'
import type { PlanStep } from '../../plans/schema'
import { store } from '../../storage/localAdapter'
import { ContactsCard } from '../contacts/ContactsCard'
import { useSetup } from '../setup/useSetup'

export function PrintPlans() {
  const { t, lang } = useI18n()
  const { profile, contacts } = useSetup()
  const ids = Object.keys(rawPlans.en ?? {}).sort()

  function print() {
    void store.setKv('readiness', { printed_at: Date.now() })
    window.print()
  }

  return (
    <div className="screen printplans">
      <div className="noprint">
        <p className="kicker mono">{t('setup.kicker')}</p>
        <h1 className="screen__title">{t('print.title')}</h1>
        <p className="muted setup__intro">{t('print.intro')}</p>
        <button type="button" className="btn btn--strong" onClick={print}>
          {t('print.button')}
        </button>
      </div>

      <section className="printplans__contacts">
        <h2 className="printplans__h">
          {profile?.name ? `${profile.name} · ` : ''}
          {t('contacts.title')}
        </h2>
        <ContactsCard contacts={contacts} />
      </section>

      {ids.map((id) => {
        const plan = getPlan(lang, id)
        if (!plan) return null
        return <PrintedGuide key={id} className="printplans__plan" kicker={t('plan.kicker', { version: plan.version })} title={t(`incident.${plan.incident}`)} steps={plan.steps} />
      })}

      <section className="printplans__part">
        <h2 className="printplans__h">{t('fixit.title')}</h2>
        <p>{t('print.fixitIntro')}</p>
      </section>
      {FIXIT_TOPICS.map((id) => {
        const fixit = getFixit(lang, id)
        if (!fixit) return null
        return <PrintedGuide key={id} className="printplans__fixit" kicker={t('fixit.kickerVersion', { version: fixit.version })} title={t(`fixit.topic.${id}`)} steps={fixit.steps} />
      })}
    </div>
  )
}

/** One plan or fix-it on paper: tick boxes, every step, avoid line, source. */
function PrintedGuide({ className, kicker, title, steps }: { className: string; kicker: string; title: string; steps: PlanStep[] }) {
  const { t } = useI18n()
  return (
    <section className={className}>
      <p className="kicker mono">{kicker}</p>
      <h2 className="printplans__h">{title}</h2>
      <ol className="printplans__steps">
        {steps.map((s) => (
          <li key={s.id} className="printplans__step">
            <span className="printplans__box" aria-hidden="true" />
            <div>
              <h3 className="printplans__title">{s.title}</h3>
              <p>{s.detail}</p>
              {s.do_not && (
                <p className="printplans__donot">
                  <span className="mono">{t('plan.doNot')}:</span> {s.do_not}
                </p>
              )}
              <p className="mono printplans__src">
                {t('plan.source')}: {s.source_name} · {s.source_url}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
