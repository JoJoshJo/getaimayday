import { useI18n } from '../i18n'
import { LANGUAGES } from '../i18n/messages'
import type { Source } from '../ai/router'
import type { ConnectionState } from './useConnection'

/** Mono status chip. Status colors (ok/warn) are used only here. */
export function StatusChip({ state }: { state: ConnectionState }) {
  const { t } = useI18n()
  const tone = state === 'preparing' ? 'warn' : 'ok'
  return (
    <span className={`chip chip--${tone}`} role="status" aria-label={`${t('status.label')}: ${t(`status.${state}`)}`}>
      <span className="chip__dot" aria-hidden="true" />
      {t(`status.${state}`)}
    </span>
  )
}

export function LangToggle() {
  const { lang, setLang, t } = useI18n()
  return (
    <div className="toggle" role="group" aria-label={t('lang.label')}>
      {LANGUAGES.map((l) => (
        <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => setLang(l)} title={t(`lang.${l}`)}>
          {l}
        </button>
      ))}
    </div>
  )
}

export function Wordmark() {
  return <span className="wordmark">AIMayday</span>
}

/** Segmented progress: one segment per step. */
export function Progress({ states, label }: { states: ('todo' | 'current' | 'done')[]; label: string }) {
  const done = states.filter((s) => s === 'done').length
  return (
    <div className="progress">
      <span className="progress__label mono">{label}</span>
      <div className="progress__bar" role="progressbar" aria-valuemin={0} aria-valuemax={states.length} aria-valuenow={done} aria-label={label}>
        {states.map((s, i) => (
          <span key={i} className={`progress__seg progress__seg--${s}`} />
        ))}
      </div>
    </div>
  )
}

/** Rubber-stamp mark shown when a step is checked. The only showy animation. */
export function Stamp({ at }: { at: Date }) {
  const { lang, t } = useI18n()
  const time = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' }).format(at)
  return (
    <span className="stamp" aria-label={t('plan.stamp', { time })}>
      {t('plan.stamp', { time })}
    </span>
  )
}

const SOURCE_LABEL: Record<Source, string> = { 'on-device': 'On-device AI', cloud: 'Cloud AI', pack: 'Offline Pack', checklist: 'Checklist' }

/** Every AI answer shows its REAL source (MASTER.md §3). */
export function SourceBadge({ source }: { source: Source }) {
  return <span className={`badge badge--${source}`}>{SOURCE_LABEL[source]}</span>
}

export function DoNot({ children }: { children: string }) {
  const { t } = useI18n()
  return (
    <div className="donot">
      <span className="donot__label mono">{t('plan.doNot')}</span>
      <p className="donot__text">{children}</p>
    </div>
  )
}
