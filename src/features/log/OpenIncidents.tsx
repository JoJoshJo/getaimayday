import { ArrowRight } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useI18n } from '../../i18n'
import { db } from '../../storage/db'
import { fmtDateTime } from './format'

/** Home banner: incidents still open, so a reload or a second visit never loses the place. */
export function OpenIncidents() {
  const { lang, t } = useI18n()
  const open = useLiveQuery(() => db.incidents.where('status').equals('open').reverse().sortBy('started_at'), [])
  if (!open?.length) return null
  return (
    <section className="openinc" aria-labelledby="openinc-title">
      <h2 id="openinc-title" className="mono openinc__title">
        {t('log.openTitle')}
      </h2>
      <ul className="openinc__list">
        {open.map((r) => (
          <li key={r.id}>
            <a className="openinc__link" href={`#/incident/${r.id}`}>
              <span className="openinc__name">{t(`incident.${r.incident}`)}</span>
              <span className="mono openinc__meta">
                {t('log.startedAt', { when: fmtDateTime(lang, r.started_at) })} · {t('plan.progressShort', { done: Object.keys(r.steps).length })}
              </span>
              <span className="mono openinc__go">{t('log.continue')} <ArrowRight className="inline-icon" aria-hidden="true" size={18} strokeWidth={1.75} /></span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
