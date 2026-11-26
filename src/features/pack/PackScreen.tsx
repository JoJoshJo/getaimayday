/**
 * #/pack: Offline Incident Pack (MASTER §7, MUST #9).
 *
 * Calm day, online: the user taps Build, sees EXACTLY what will be sent
 * (business context without names or numbers, plan steps, the full prompts),
 * then taps "Send to cloud AI". Cloud Gemini (AI Logic, ONLY_IN_CLOUD) writes
 * one chunk per plan per language; each chunk is validated and saved at once.
 * Any time, offline too: search the Pack (MiniSearch, no model).
 */
import { useMemo, useRef, useState } from 'react'
import { useI18n } from '../../i18n'
import type { Lang } from '../../i18n/messages'
import { businessContext, packInputHash, packJobs, runPackJob, type PackJob } from '../../pack/build'
import { buildIndex, countAnswers, matchPack, type PackMatch } from '../../pack/match'
import type { Pack, PackLang } from '../../pack/schema'
import { isAuthError, isTransient, resilient } from '../../pack/retry'
import { beginBuild, markFailed, partsToRetry, saveChunk, usePack } from '../../pack/store'
import { SourceBadge } from '../../ui/components'
import { useConnection } from '../../ui/useConnection'
import { fmtDateTime } from '../log/format'
import { EMPTY_PROFILE, type Contacts, type Profile } from '../setup/model'
import { useSetup } from '../setup/useSetup'
import { PackAnswer } from './PackAnswer'

type JobState = { state: 'waiting' | 'writing' | 'retrying' | 'done' | 'failed'; count?: number; dropped?: number; error?: string; attempt?: number; seconds?: number; fallback?: string }

export function PackScreen() {
  const { t, lang } = useI18n()
  const pack = usePack()
  const { profile, contacts } = useSetup()
  const online = useConnection() !== 'offline'

  if (pack === undefined || profile === undefined || contacts === undefined) return <p className="screen muted">{t('log.loading')}</p>

  return (
    <div className="screen pack">
      <p className="kicker mono">{t('setup.kicker')}</p>
      <h1 className="screen__title">{t('pack.title')}</h1>
      <p className="muted setup__intro">{t('pack.intro')}</p>

      <PackStatus pack={pack} profile={profile} contacts={contacts ?? {}} />
      <Builder online={online} pack={pack} profile={profile} contacts={contacts ?? {}} />
      <PackSearch pack={pack} lang={lang} contacts={contacts ?? {}} />
    </div>
  )
}

function PackStatus({ pack, profile, contacts }: { pack: Pack | null; profile: Profile | null; contacts: Contacts }) {
  const { t, lang } = useI18n()
  if (!pack) return <p className="pack__status mono">{t('pack.none')}</p>
  const stale = profile && pack.input_hash !== packInputHash(profile, contacts)
  return (
    <div className="pack__status">
      <p className="mono">
        {t('pack.built', { date: fmtDateTime(lang, pack.updated_at), version: String(pack.version) })}
      </p>
      <p className="muted">{t('pack.counts', { en: String(countAnswers(pack, 'en')), fr: String(countAnswers(pack, 'fr')) })}</p>
      {stale && <p>{t('pack.stale')}</p>}
    </div>
  )
}

function Builder({ online, pack, profile, contacts }: { online: boolean; pack: Pack | null; profile: Profile | null; contacts: Contacts }) {
  const { t } = useI18n()
  const [phase, setPhase] = useState<'idle' | 'preview' | 'building' | 'finished'>('idle')
  // What the preview shows and the build sends: every part, or only the failed ones.
  const [run, setRun] = useState<{ jobs: PackJob[]; fresh: boolean }>({ jobs: [], fresh: true })
  const [states, setStates] = useState<Record<string, JobState>>({})
  const stop = useRef(false)
  const p = profile ?? EMPTY_PROFILE
  const jobs = useMemo(() => packJobs(p, contacts), [p, contacts])
  const hash = packInputHash(p, contacts)
  const retryKeys = partsToRetry(pack, hash, jobs.map((j) => j.key))
  const retryJobs = jobs.filter((j) => retryKeys.includes(j.key))

  if (!profile)
    return (
      <p className="pack__block">
        {t('pack.needSetup')} <a href="#/setup">{t('nav.setup')}</a>
      </p>
    )

  const set = (key: string, s: JobState) => setStates((all) => ({ ...all, [key]: s }))

  async function build() {
    const { jobs: list, fresh } = run
    setPhase('building')
    stop.current = false
    setStates(Object.fromEntries(list.map((j) => [j.key, { state: 'waiting' }])))
    const { cloudJson, packFallbackModel } = await import('../../ai/cloud')
    const fallbackModel = await packFallbackModel()
    if (fresh || !pack) await beginBuild(hash)
    for (const job of list) {
      if (stop.current) break
      set(job.key, { state: 'writing' })
      const generate = resilient((prompt, schema, model?: string) => cloudJson(prompt, schema, 0.3, model), {
        fallbackModel,
        cancelled: () => stop.current,
        onRetry: (attempt, ms) => set(job.key, { state: 'retrying', attempt, seconds: Math.round(ms / 1000) }),
        onFallback: (model) => set(job.key, { state: 'writing', fallback: model }),
      })
      try {
        const { chunk, dropped } = await runPackJob(job, generate)
        await saveChunk(job.key, chunk)
        const count = chunk.kind === 'plan' ? chunk.qa.length : chunk.terms.length
        console.info('[AIMayday] pack chunk saved', job.key, { count, dropped, model: chunk.model })
        set(job.key, { state: 'done', count, dropped })
      } catch (e) {
        console.warn('[AIMayday] pack chunk failed', job.key, e)
        const raw = e instanceof Error ? e.message : String(e)
        const error = isTransient(e) ? t('pack.err.busy') : isAuthError(e) ? t('pack.err.access') : raw
        await markFailed(job.key, raw)
        set(job.key, { state: 'failed', error })
      }
    }
    setPhase('finished')
  }

  const open = (list: PackJob[], fresh: boolean) => {
    setRun({ jobs: list, fresh })
    setPhase('preview')
  }

  if (!online && phase !== 'building') return <p className="pack__block mono">{t('pack.offline')}</p>

  if (phase === 'idle' || phase === 'finished')
    return (
      <div className="pack__block">
        {phase === 'finished' && <JobList jobs={run.jobs} states={states} />}
        {retryJobs.length > 0 && (
          <div className="pack__retry" role="status">
            <p>{retryJobs.length === 1 ? t('pack.failedPart') : t('pack.failedParts', { n: String(retryJobs.length) })}</p>
            <p className="mono muted">{retryJobs.map((j) => jobLabel(j, t)).join(' · ')}</p>
            <button type="button" className="btn btn--strong" onClick={() => open(retryJobs, false)}>
              {t('pack.retryFailed')}
            </button>
          </div>
        )}
        <button type="button" className={retryJobs.length ? 'btn' : 'btn btn--strong'} onClick={() => open(jobs, true)}>
          {t('pack.build')}
        </button>
      </div>
    )

  if (phase === 'preview') return <Preview jobs={run.jobs} profile={p} contacts={contacts} onSend={build} onCancel={() => setPhase('idle')} />

  return (
    <div className="pack__block">
      <JobList jobs={run.jobs} states={states} />
      <button type="button" className="btn" onClick={() => (stop.current = true)}>
        {t('pack.stop')}
      </button>
    </div>
  )
}

function jobLabel(job: PackJob, t: ReturnType<typeof useI18n>['t']) {
  const what = job.kind === 'plan' ? t(`incident.${job.plan.incident}`) : t('pack.glossary')
  return `${what} · ${job.lang.toUpperCase()}`
}

function JobList({ jobs, states }: { jobs: PackJob[]; states: Record<string, JobState> }) {
  const { t } = useI18n()
  return (
    <ol className="pack__jobs" aria-live="polite">
      {jobs.map((j) => {
        const s = states[j.key] ?? { state: 'waiting' }
        return (
          <li key={j.key} className="pack__job">
            <span>{jobLabel(j, t)}</span>
            <span className="mono">
              {s.state === 'done' && <SourceBadge source="cloud" />}{' '}
              {t(`pack.job.${s.state}`, { n: String(s.count ?? 0), attempt: String(s.attempt ?? 1), seconds: String(s.seconds ?? 0) })}
            </span>
            {s.fallback && s.state === 'writing' && <span className="muted pack__err">{t('pack.job.fallback', { model: s.fallback })}</span>}
            {s.state === 'done' && !!s.dropped && <span className="muted pack__err">{t('pack.job.dropped', { n: String(s.dropped) })}</span>}
            {s.error && <span className="muted pack__err">{s.error}</span>}
          </li>
        )
      })}
    </ol>
  )
}

function Preview({ jobs, profile, contacts, onSend, onCancel }: { jobs: PackJob[]; profile: Profile; contacts: Contacts; onSend: () => void; onCancel: () => void }) {
  const { t } = useI18n()
  return (
    <section className="preview pack__block" aria-labelledby="preview-title">
      <h2 id="preview-title" className="mono preview__title">
        {t('preview.title')}
      </h2>
      <p>
        <strong>{t('preview.sentTo')}</strong> {t('preview.gemini')}
      </p>
      <p className="mono preview__label">{t('preview.whatSent')}</p>
      <pre className="preview__box">{businessContext(profile, contacts)}</pre>
      <p className="muted">{t('pack.alsoSent', { n: String(jobs.length) })}</p>
      <p>{t('pack.notSent')}</p>
      <details>
        <summary>{t('preview.exact')}</summary>
        {jobs.map((j) => (
          <div key={j.key}>
            <p className="mono preview__label">{jobLabel(j, t)}</p>
            <pre className="preview__box">{j.prompt}</pre>
          </div>
        ))}
      </details>
      <div className="log__actions">
        <button type="button" className="btn btn--strong" onClick={onSend}>
          {t('preview.send')}
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          {t('preview.cancel')}
        </button>
      </div>
    </section>
  )
}

function PackSearch({ pack, lang, contacts }: { pack: Pack | null; lang: Lang; contacts: Contacts }) {
  const { t } = useI18n()
  const [q, setQ] = useState('')
  const [match, setMatch] = useState<PackMatch | null>(null)
  const index = useMemo(() => (pack ? buildIndex(pack, lang as PackLang) : null), [pack, lang])
  if (!pack || !index) return null
  return (
    <section className="pack__block" aria-labelledby="pack-search">
      <h2 id="pack-search" className="mono setup__legend">
        {t('pack.searchTitle')}
      </h2>
      <form
        className="pack__search"
        onSubmit={(e) => {
          e.preventDefault()
          setMatch(q.trim() ? matchPack(index, q) : null)
        }}
      >
        <label className="field">
          <span className="field__label mono">{t('pack.searchLabel')}</span>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
        </label>
        <div>
          <button type="submit" className="btn">
            {t('pack.search')}
          </button>
        </div>
      </form>
      {match && <PackAnswer match={match} contacts={contacts} />}
    </section>
  )
}
