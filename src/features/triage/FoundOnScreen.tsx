/**
 * "FOUND ON SCREEN · PLEASE CONFIRM" (DESIGN.md §6, MUST #6).
 *
 * Reads a ransom-screen photo with on-device AI (router.triage → AI Logic,
 * ONLY_ON_DEVICE) when Chrome says the model is available. The result only
 * PREFILLS editable fields; nothing is saved until the user confirms. Without
 * on-device AI (or if it fails) the same panel opens empty: the user types what
 * they read. The user never has to wait: "Type it in myself" skips the AI.
 */
import { useEffect, useRef, useState } from 'react'
import type { InferenceMode } from 'firebase/ai'
import { blobToBase64 } from '../../ai/image'
import { router, type Source } from '../../ai/router'
import { TRIAGE_TYPES, type Confidence, type TriageResult } from '../../ai/schemas'
import { onDeviceAvailability } from '../../ai/warmup'
import { useI18n } from '../../i18n'
import { routeTriage, type TriageRoute } from '../../plans/route'
import { store } from '../../storage/localAdapter'
import { DoNot, SourceBadge } from '../../ui/components'
import { startIncident } from '../incident/start'
import { useConnection } from '../../ui/useConnection'
import { PhotoThumb } from '../log/PhotoThumb'
import { cloudSuggestions, fieldStatuses, fromForm, TEXT_FIELDS, toForm, type FormValues } from './confirm'

type Props = { incidentId: string; currentIncident: string; photoId: string; onClose: () => void }

type Phase =
  | { kind: 'reading' }
  | { kind: 'form'; source: Source; ai: TriageResult | null; note: 'none' | 'no-ai' | 'failed' }
  | { kind: 'saved'; route: TriageRoute }

/** Cloud double-check (DESIGN.md §6): online only, preview first, never overwrites. */
type Cloud = { kind: 'off' } | { kind: 'preview' } | { kind: 'sending' } | { kind: 'done'; suggest: Partial<FormValues> } | { kind: 'failed' }

// Type-only import above keeps Firebase out of the main bundle; this is InferenceMode.PREFER_IN_CLOUD.
const PREFER_IN_CLOUD = 'prefer_in_cloud' as InferenceMode

export function FoundOnScreen({ incidentId, currentIncident, photoId, onClose }: Props) {
  const { t } = useI18n()
  const [phase, setPhase] = useState<Phase>({ kind: 'reading' })
  const [form, setForm] = useState<FormValues>(toForm(null))
  /** What the panel opened with (AI prefill or empty): a field that differs was edited by the user. */
  const [opened, setOpened] = useState<FormValues>(toForm(null))
  const [cloud, setCloud] = useState<Cloud>({ kind: 'off' })
  const online = useConnection() !== 'offline'
  const skipped = useRef(false)
  const panelRef = useRef<HTMLElement>(null)
  const firstField = useRef<HTMLSelectElement>(null)

  const manual = (note: 'no-ai' | 'failed' | 'none', source: Source = 'checklist') => {
    skipped.current = true
    setForm(toForm(null))
    setOpened(toForm(null))
    setPhase({ kind: 'form', source, ai: null, note })
  }

  useEffect(() => {
    let live = true
    skipped.current = false
    const stale = () => !live || skipped.current
    ;(async () => {
      if ((await onDeviceAvailability()) !== 'available') return stale() || manual('no-ai')
      const photo = await store.getPhoto(photoId)
      if (!photo) return stale() || manual('failed')
      const r = await router.triage({ base64: await blobToBase64(photo.blob), mimeType: photo.mime })
      if (stale()) return
      if (r.data && r.source === 'on-device') {
        setForm(toForm(r.data))
        setOpened(toForm(r.data))
        setPhase({ kind: 'form', source: 'on-device', ai: r.data, note: 'none' })
      } else manual('failed')
    })()
    return () => {
      live = false
    }
  }, [photoId])

  useEffect(() => {
    if (phase.kind === 'form') firstField.current?.focus()
    if (phase.kind === 'saved') panelRef.current?.focus()
  }, [phase.kind])

  async function confirm(e: React.FormEvent) {
    e.preventDefault()
    if (phase.kind !== 'form') return
    const saved = fromForm(form)
    await store.addEvent(incidentId, {
      kind: 'triage',
      photo_id: photoId,
      source: phase.source,
      confidence: phase.ai ? phase.ai.confidence : null,
      fields: saved,
      status: fieldStatuses(phase.ai, saved),
      ...(cloud.kind === 'done' ? { cloud_checked: true } : {}),
    })
    const type = saved.incident_type
    setPhase({ kind: 'saved', route: typeof type === 'string' ? routeTriage(type as (typeof TRIAGE_TYPES)[number]) : { kind: 'tiles', reason: 'not-sure' } })
  }

  const set = <K extends keyof FormValues>(k: K, v: FormValues[K]) => setForm((f) => ({ ...f, [k]: v }))

  async function sendToCloud() {
    setCloud({ kind: 'sending' })
    try {
      const photo = await store.getPhoto(photoId)
      if (!photo) throw new Error('photo missing')
      const r = await router.triage({ base64: await blobToBase64(photo.blob), mimeType: photo.mime }, PREFER_IN_CLOUD)
      // Only a real cloud answer counts as a cloud check (PREFER_IN_CLOUD may fall back on-device).
      if (r.source !== 'cloud' || !r.data) throw new Error(r.error ?? `source ${r.source}`)
      const cloudForm = toForm(r.data)
      setCloud({ kind: 'done', suggest: cloudSuggestions(opened, form, cloudForm) })
    } catch (e) {
      console.warn('[AIMayday] cloud double-check failed', e)
      setCloud({ kind: 'failed' })
    }
  }

  const label = (k: keyof FormValues, v: string) =>
    k === 'incident_type' ? t(`triage.type.${v as (typeof TRIAGE_TYPES)[number]}`) : k === 'is_ransom_demand' ? t(v === 'yes' ? 'triage.yes' : 'triage.no') : v

  /** "Cloud AI found: X · Use this" under a field, only after a cloud check. */
  const suggestion = (k: keyof FormValues) => {
    const v = cloud.kind === 'done' ? cloud.suggest[k] : undefined
    if (!v || form[k] !== opened[k]) return null
    return (
      <p className="found__cloud">
        <SourceBadge source="cloud" /> <span className="mono">{label(k, v)}</span>{' '}
        <button type="button" className="btn btn--quiet" onClick={() => set(k, v as never)}>
          {t('triage.cloud.use')}
        </button>
      </p>
    )
  }

  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      className="found"
      aria-labelledby="found-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && phase.kind !== 'saved') onClose()
      }}
    >
      <header className="found__head">
        <h3 id="found-title" className="mono found__title">
          {t('triage.title')}
        </h3>
        {phase.kind === 'form' && <SourceBadge source={phase.source} />}
        {phase.kind === 'form' && phase.ai && (
          <span className="mono">{t('triage.confidence', { level: t(`triage.level.${phase.ai.confidence as Confidence}`) })}</span>
        )}
      </header>

      {phase.kind === 'reading' && (
        <div className="found__body" role="status">
          <p className="mono">{t('triage.reading')}</p>
          <div className="log__actions">
            <button type="button" className="btn" onClick={() => manual('none')}>
              {t('triage.manual')}
            </button>
            <button type="button" className="btn btn--quiet" onClick={onClose}>
              {t('triage.discard')}
            </button>
          </div>
        </div>
      )}

      {phase.kind === 'form' && (
        <form className="found__body" onSubmit={confirm}>
          <p>{phase.note === 'no-ai' ? t('triage.noAi') : phase.note === 'failed' ? t('triage.failed') : t('triage.intro')}</p>

          <label className="found__row">
            <span className="mono found__label">{t('triage.f.incident_type')}</span>
            <select name="incident_type" ref={firstField} className="input" value={form.incident_type} onChange={(e) => set('incident_type', e.target.value as FormValues['incident_type'])}>
              <option value="">{t('triage.notFound')}</option>
              {TRIAGE_TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {t(`triage.type.${ty}`)}
                </option>
              ))}
            </select>
          </label>
          {suggestion('incident_type')}

          <div className="found__row" role="group" aria-labelledby="found-ransom">
            <span id="found-ransom" className="mono found__label">
              {t('triage.f.is_ransom_demand')}
            </span>
            <div className="toggle">
              {(['yes', 'no'] as const).map((v) => (
                <button key={v} type="button" aria-pressed={form.is_ransom_demand === v} onClick={() => set('is_ransom_demand', form.is_ransom_demand === v ? '' : v)}>
                  {t(`triage.${v}`)}
                </button>
              ))}
            </div>
          </div>
          {suggestion('is_ransom_demand')}

          {TEXT_FIELDS.map((k) => (
            <div key={k}>
            <label className="found__row">
              <span className="mono found__label">{t(`triage.f.${k}`)}</span>
              <input
                name={k}
                className="input"
                inputMode={k === 'ransom_amount' ? 'decimal' : undefined}
                value={form[k]}
                placeholder={t('triage.notFound')}
                onChange={(e) => set(k, e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            {suggestion(k)}
            </div>
          ))}

          {online && cloud.kind === 'off' && (
            <div>
              <button type="button" className="btn" onClick={() => setCloud({ kind: 'preview' })}>
                {t('triage.cloud.check')}
              </button>
            </div>
          )}
          {online && cloud.kind === 'preview' && (
            <section className="preview" aria-labelledby="cloud-preview">
              <h4 id="cloud-preview" className="mono preview__title">
                {t('preview.title')}
              </h4>
              <PhotoThumb photoId={photoId} alt={t('triage.cloud.imageAlt')} />
              <p>
                <strong>{t('preview.sentTo')}</strong> {t('preview.gemini')}
              </p>
              <p>{t('triage.cloud.what')}</p>
              <div className="log__actions">
                <button type="button" className="btn btn--strong" onClick={() => void sendToCloud()}>
                  {t('preview.send')}
                </button>
                <button type="button" className="btn" onClick={() => setCloud({ kind: 'off' })}>
                  {t('preview.cancel')}
                </button>
              </div>
            </section>
          )}
          {cloud.kind === 'sending' && (
            <p className="mono" role="status">
              {t('triage.cloud.sending')}
            </p>
          )}
          {cloud.kind === 'done' && (
            <p className="muted" role="status">
              {Object.keys(cloud.suggest).length ? t('triage.cloud.differs') : t('triage.cloud.same')}
            </p>
          )}
          {cloud.kind === 'failed' && (
            <p className="muted" role="status">
              {t('triage.cloud.failed')}
            </p>
          )}

          <DoNot>{t('triage.avoid')}</DoNot>

          <div className="log__actions">
            <button type="submit" className="btn btn--strong">
              {t('triage.confirm')}
            </button>
            <button type="button" className="btn" onClick={onClose}>
              {t('triage.discard')}
            </button>
          </div>
        </form>
      )}

      {phase.kind === 'saved' && (
        <div className="found__body" role="status">
          <p>{t('triage.saved')}</p>
          {phase.route.kind === 'plan' && phase.route.incident !== currentIncident && (
            <p className="home__line">
              {t('triage.suggest', { incident: t(`incident.${phase.route.incident}`) })}
              <button type="button" className="btn" onClick={() => phase.route.kind === 'plan' && void startIncident(phase.route.incident, 'tile')}>
                {t('triage.startPlan')}
              </button>
            </p>
          )}
          {phase.route.kind === 'tiles' && phase.route.reason === 'no-plan-yet' && <p className="muted">{t('triage.noPlanYet')}</p>}
          <div>
            <button type="button" className="btn" onClick={onClose}>
              {t('triage.done')}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
