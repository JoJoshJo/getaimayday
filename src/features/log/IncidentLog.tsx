/**
 * Incident log (MASTER §6 MUST #5): timeline of everything that happened,
 * notes, photos. Every entry is timestamped by the app. Stays on the device.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { useI18n } from '../../i18n'
import type { Plan } from '../../plans/schema'
import type { IncidentRecord, LogEvent } from '../../storage/db'
import { store } from '../../storage/localAdapter'
import { SourceBadge } from '../../ui/components'
import { fmtDateTime, fmtTime } from './format'

export const PHOTO_TYPES = ['image/png', 'image/jpeg']

export function PhotoThumb({ photoId, alt }: { photoId: string; alt: string }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    let u: string | undefined
    let live = true
    store.getPhoto(photoId).then((p) => {
      if (!p || !live) return
      u = URL.createObjectURL(p.blob)
      setUrl(u)
    })
    return () => {
      live = false
      if (u) URL.revokeObjectURL(u)
    }
  }, [photoId])
  return url ? <img className="thumb" src={url} alt={alt} /> : <span className="thumb thumb--empty" />
}

export function IncidentLog({ record, plan, extras }: { record: IncidentRecord; plan: Plan; extras?: ReactNode }) {
  const { lang, t } = useI18n()
  const [note, setNote] = useState('')
  const [photoError, setPhotoError] = useState('')
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
    await store.addPhoto(record.id, file, file.name)
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
          </span>
        )
      case 'triage':
        return (
          <span>
            <SourceBadge source={e.source} /> {t('log.ev.triage')}
          </span>
        )
      case 'ai':
        return (
          <span>
            <SourceBadge source={e.source} /> {t('log.ev.ai', { job: e.job })}
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
          <textarea className="input input--area" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('log.notePlaceholder')} />
        </label>
        <div className="log__actions">
          <button type="submit" className="btn" disabled={!note.trim()}>
            {t('log.addNote')}
          </button>
          <label className="btn">
            {t('log.addPhoto')}
            <input className="visually-hidden" type="file" accept="image/png,image/jpeg" onChange={(e) => void addPhoto(e.target.files?.[0]).then(() => (e.target.value = ''))} />
          </label>
        </div>
        {photoError && <p className="field__hint">{photoError}</p>}
      </form>

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
