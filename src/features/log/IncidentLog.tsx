/**
 * Incident log (MASTER §6 MUST #5): timeline of everything that happened,
 * notes, photos. Every entry is timestamped by the app. Stays on the device.
 */
import { useState, type ReactNode } from 'react'
import { useI18n } from '../../i18n'
import type { Plan } from '../../plans/schema'
import type { IncidentRecord, LogEvent } from '../../storage/db'
import { store } from '../../storage/localAdapter'
import { rewarmIfIdle } from '../../ai/warmup'
import { SourceBadge } from '../../ui/components'
import { FoundOnScreen } from '../triage/FoundOnScreen'
import { isDocJob } from '../online/jobs'
import type { TriageFieldName } from '../../storage/db'
import { fmtDateTime, fmtTime, PHOTO_TYPES } from './format'
import { PhotoThumb } from './PhotoThumb'

export function IncidentLog({ record, plan, extras }: { record: IncidentRecord; plan: Plan; extras?: ReactNode }) {
  const { lang, t } = useI18n()
  const [note, setNote] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [reading, setReading] = useState<string | null>(null)
  const triaged = new Set(record.events.flatMap((e) => (e.kind === 'triage' ? [e.photo_id] : [])))
  const stepTitle = (id: string) => plan.steps.find((s) => s.id === id)?.title ?? id

  async function addNote(e: React.FormEvent) {
    e.preventDefault()
    const text = note.trim()
    if (!text) return
    await store.addEvent(record.id, { kind: 'note', text })
    setNote('')
  }

  async function addPhoto(file: File | undefined) {
    setPhotoError('')
    if (!file) return
    if (!PHOTO_TYPES.includes(file.type)) return setPhotoError(t('log.photoType'))
    const p = await store.addPhoto(record.id, file, file.name)
    return p
  }

  function line(e: LogEvent): ReactNode {
    switch (e.kind) {
      case 'started':
        return t('log.ev.started', { incident: t(`incident.${record.incident}`) })
      case 'step':
        return `${t(e.done ? 'log.ev.checked' : 'log.ev.unchecked')}: ${stepTitle(e.step_id)}`
      case 'note':
        return <span className="log__note">{e.text}</span>
      case 'photo':
        return (
          <span className="log__photo">
            {t('log.ev.photo')}
            <PhotoThumb photoId={e.photo_id} alt={t('log.ev.photo')} />
            {!triaged.has(e.photo_id) && reading !== e.photo_id && (
              <span>
                <button type="button" className="btn" onClick={() => setReading(e.photo_id)}>
                  {t('triage.read')}
                </button>
              </span>
            )}
          </span>
        )
      case 'triage':
        return (
          <span className="log__triage">
            <span className="home__line">
              <SourceBadge source={e.source} /> {t('log.ev.triage')}
              {e.cloud_checked && <span className="mono muted"> · {t('triage.cloud.logged')}</span>}
            </span>
            <dl className="log__fields">
              {(Object.keys(e.fields) as TriageFieldName[])
                .filter((k) => e.fields[k] !== null || e.status[k] === 'edited')
                .map((k) => (
                  <div key={k} className="notes__row">
                    <dt className="mono">{t(`triage.f.${k}`)}</dt>
                    <dd>
                      {e.fields[k] === null ? <span className="muted">{t('triage.st.removed')}</span> : k === 'incident_type' ? t(`triage.type.${e.fields[k] as 'ransomware'}`) : k === 'is_ransom_demand' ? t(e.fields[k] ? 'triage.yes' : 'triage.no') : String(e.fields[k])}
                      {e.status[k] !== 'found' && e.fields[k] !== null && <span className="mono muted"> · {t(`triage.st.${e.status[k]}`)}</span>}
                    </dd>
                  </div>
                ))}
            </dl>
          </span>
        )
      case 'ai':
        return (
          <span>
            <SourceBadge source={e.source} /> {e.job === 'ask' ? t('log.ev.ask', { question: e.question ?? '' }) : isDocJob(e.job) ? t('log.ev.doc', { job: t(`online.job.${e.job}`) }) : t('log.ev.ai', { job: e.job })}
          </span>
        )
      case 'closed':
        return t('log.ev.closed')
      case 'reopened':
        return t('log.ev.reopened')
    }
  }

  return (
    <section className="log" aria-labelledby="log-title">
      <h2 id="log-title" className="mono log__title">
        {t('log.title')}
      </h2>
      <p className="muted">{t('log.startedAt', { when: fmtDateTime(lang, record.started_at) })}</p>

      <form className="log__form" onSubmit={addNote}>
        <label className="field">
          <span className="field__label mono">{t('log.noteLabel')}</span>
          <textarea name="note" className="input input--area" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('log.notePlaceholder')} />
        </label>
        <div className="log__actions">
          <button type="submit" className="btn" disabled={!note.trim()}>
            {t('log.addNote')}
          </button>
          {/* Session 12: Chrome unloads Nano after ~15–25 s idle; start loading it while the photo is picked. */}
          <label className="btn" onClick={() => rewarmIfIdle('photo-picker')}>
            {t('log.addPhoto')}
            <input
              name="photo"
              className="visually-hidden"
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => {
                const input = e.target
                void addPhoto(input.files?.[0]).then(() => (input.value = ''))
              }}
            />
          </label>
        </div>
        {photoError && <p className="field__hint">{photoError}</p>}
      </form>

      {reading && <FoundOnScreen incidentId={record.id} currentIncident={record.incident} photoId={reading} onClose={() => setReading(null)} />}

      {extras}

      <ol className="log__list">
        {[...record.events].reverse().map((e, i) => (
          <li key={record.events.length - i} className="log__row">
            <span className="mono log__time">{fmtTime(lang, e.at)}</span>
            <span className="log__text">{line(e)}</span>
          </li>
        ))}
      </ol>

      <div className="log__actions">
        {record.status === 'open' ? (
          <button type="button" className="btn" onClick={() => void store.setStatus(record.id, 'closed')}>
            {t('log.close')}
          </button>
        ) : (
          <button type="button" className="btn" onClick={() => void store.setStatus(record.id, 'open')}>
            {t('log.reopen')}
          </button>
        )}
        <a className="btn btn--quiet" href="#/incidents">
          {t('log.past')}
        </a>
      </div>
    </section>
  )
}
