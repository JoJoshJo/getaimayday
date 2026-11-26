/**
 * "Back online" panel under the incident log (MUST #10). Offline it only says
 * what will be possible later. Online: pick a job → preview of the exact text
 * → "Send to cloud AI" (AI Logic, ONLY_IN_CLOUD) → document with Cloud AI badge,
 * Copy and Print. Each document is saved in the incident log.
 */
import { useState } from 'react'
import { useI18n } from '../../i18n'
import type { Plan } from '../../plans/schema'
import type { IncidentRecord } from '../../storage/db'
import { store } from '../../storage/localAdapter'
import { SourceBadge } from '../../ui/components'
import { useConnection } from '../../ui/useConnection'
import { fmtTime } from '../log/format'
import { DOC_JOBS, incidentSummary, isDocJob, jobPrompt, runDocJob, type DocJob } from './jobs'

type Phase = { kind: 'idle' } | { kind: 'preview'; job: DocJob } | { kind: 'writing'; job: DocJob } | { kind: 'failed'; job: DocJob; error: string }

export function BackOnline({ record, plan }: { record: IncidentRecord; plan: Plan }) {
  const { t, lang } = useI18n()
  const online = useConnection() !== 'offline'
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [includeNotes, setIncludeNotes] = useState(true)

  const docs = record.events.flatMap((e) => (e.kind === 'ai' && e.source === 'cloud' && e.text && isDocJob(e.job) ? [{ ...e, job: e.job as DocJob }] : [])).reverse()
  const prompt = (job: DocJob) => jobPrompt(job, incidentSummary(record, plan, { includeNotes }), lang === 'fr' ? 'fr' : 'en')

  async function send(job: DocJob) {
    setPhase({ kind: 'writing', job })
    try {
      const { cloudText } = await import('../../ai/cloud')
      const r = await runDocJob(prompt(job), (p) => cloudText(p))
      await store.addEvent(record.id, { kind: 'ai', job, source: 'cloud', text: r.text, model: r.model })
      setPhase({ kind: 'idle' })
    } catch (e) {
      console.warn('[AIMayday] cloud job failed', job, e)
      setPhase({ kind: 'failed', job, error: e instanceof Error ? e.message : String(e) })
    }
  }

  return (
    <section className="online" aria-labelledby="online-title">
      <h2 id="online-title" className="mono log__title">
        {t('online.title')}
      </h2>

      {!online ? (
        <p className="muted">{t('online.offline')}</p>
      ) : (
        <>
          <p className="muted">{t('online.intro')}</p>
          {phase.kind === 'idle' && (
            <div className="log__actions">
              {DOC_JOBS.map((j) => (
                <button key={j} type="button" className="btn" onClick={() => setPhase({ kind: 'preview', job: j })}>
                  {t(`online.job.${j}`)}
                </button>
              ))}
            </div>
          )}
          {phase.kind === 'preview' && (
            <section className="preview" aria-labelledby="online-preview">
              <h3 id="online-preview" className="mono preview__title">
                {t('preview.title')} · {t(`online.job.${phase.job}`)}
              </h3>
              <p>
                <strong>{t('preview.sentTo')}</strong> {t('preview.gemini')}
              </p>
              <label className="online__check">
                <input type="checkbox" checked={includeNotes} onChange={(e) => setIncludeNotes(e.target.checked)} /> {t('online.includeNotes')}
              </label>
              <p className="muted">{t('online.notSent')}</p>
              <p className="mono preview__label">{t('online.exact')}</p>
              <pre className="preview__box">{prompt(phase.job)}</pre>
              <div className="log__actions">
                <button type="button" className="btn btn--strong" onClick={() => void send(phase.job)}>
                  {t('preview.send')}
                </button>
                <button type="button" className="btn" onClick={() => setPhase({ kind: 'idle' })}>
                  {t('preview.cancel')}
                </button>
              </div>
            </section>
          )}
          {phase.kind === 'writing' && (
            <p className="mono" role="status">
              {t('online.writing', { job: t(`online.job.${phase.job}`) })}
            </p>
          )}
          {phase.kind === 'failed' && (
            <div role="alert">
              <p>{t('online.failed')}</p>
              <p className="muted pack__err">{phase.error}</p>
              <button type="button" className="btn" onClick={() => setPhase({ kind: 'idle' })}>
                {t('preview.cancel')}
              </button>
            </div>
          )}
        </>
      )}

      {docs.map((d) => (
        <DocView key={d.at} title={t(`online.job.${d.job}`)} text={d.text!} at={fmtTime(lang, d.at)} model={d.model} />
      ))}
    </section>
  )
}

function DocView({ title, text, at, model }: { title: string; text: string; at: string; model?: string }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const [printing, setPrinting] = useState(false)

  function print() {
    setPrinting(true)
    document.body.classList.add('print-doc')
    const done = () => {
      document.body.classList.remove('print-doc')
      setPrinting(false)
      window.removeEventListener('afterprint', done)
    }
    window.addEventListener('afterprint', done)
    // Let React paint the print marker first.
    requestAnimationFrame(() => window.print())
  }

  return (
    <article className={`doc${printing ? ' doc--print' : ''}`}>
      <header className="doc__head">
        <SourceBadge source="cloud" />
        <h3 className="doc__title">{title}</h3>
        <span className="mono muted">
          {at}
          {model ? ` · ${model}` : ''}
        </span>
      </header>
      <p className="muted doc__note">{t('online.check')}</p>
      <div className="doc__text">{text}</div>
      <div className="log__actions doc__actions">
        <button
          type="button"
          className="btn"
          onClick={() =>
            void navigator.clipboard.writeText(text).then(
              () => setCopied(true),
              () => setCopied(false),
            )
          }
        >
          {copied ? t('online.copied') : t('online.copy')}
        </button>
        <button type="button" className="btn" onClick={print}>
          {t('online.print')}
        </button>
      </div>
    </article>
  )
}
