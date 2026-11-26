import { useLiveQuery } from 'dexie-react-hooks'
import { useI18n } from '../../i18n'
import { store } from '../../storage/localAdapter'
import { fmtDateTime } from './format'

/** #/incidents: every incident on this device, newest first. */
export function IncidentList() {
  const { lang, t } = useI18n()
  const list = useLiveQuery(() => store.listIncidents(), [])
  return (
    <section className="screen" aria-labelledby="list-title">
      <p className="kicker mono">{t('log.kicker')}</p>
      <h1 id="list-title" className="screen__title">
        {t('log.past')}
      </h1>
      {list && list.length === 0 && <p className="muted">{t('log.none')}</p>}
      <ul className="tiles">
        {list?.map((r) => (
          <li key={r.id}>
            <a className="tile" href={`#/incident/${r.id}`}>
              <span className="tile__title">{t(`incident.${r.incident}`)}</span>
              <span className="tile__desc">
                {fmtDateTime(lang, r.started_at)} · {t(r.status === 'open' ? 'log.statusOpen' : 'log.statusClosed')} ·{' '}
                {t('plan.progressShort', { done: Object.keys(r.steps).length })}
              </span>
              <span className="tile__go mono" aria-hidden="true">
                →
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
