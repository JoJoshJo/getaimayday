/**
 * #/ready: Get ready checklist (MUST #11). What to do on a calm day so incident
 * day works offline. The top-bar chip shows the same count.
 */
import { useState } from 'react'
import { useI18n } from '../../i18n'
import type { MessageKey } from '../../i18n/messages'
import { ErrorNote } from '../../ui/components'
import { useConnection } from '../../ui/useConnection'
import { fmtDateTime } from '../log/format'
import type { ReadyItem } from './readiness'
import { useReadiness } from './useReadiness'

const LINK: Partial<Record<ReadyItem['key'], string>> = { profile: '#/setup', contacts: '#/setup', pack: '#/pack', printed: '#/print' }

export function ReadyScreen() {
  const { t } = useI18n()
  const r = useReadiness()
  if (!r) return <p className="screen muted">{t('log.loading')}</p>
  return (
    <div className="screen ready">
      <p className="kicker mono">{t('ready.kicker', { done: String(r.done), total: String(r.total) })}</p>
      <h1 className="screen__title">{t('ready.title')}</h1>
      <p className="muted setup__intro">{t('ready.intro')}</p>
      <ol className="ready__list">
        {r.items.map((it) => (
          <Row key={it.key} item={it} />
        ))}
      </ol>
    </div>
  )
}

function Row({ item }: { item: ReadyItem }) {
  const { t, lang } = useI18n()
  const when = item.detail && (item.key === 'pack' || item.key === 'printed') ? fmtDateTime(lang, Number(item.detail)) : ''
  const text =
    item.key === 'contacts'
      ? t(`ready.contacts.${item.state}` as MessageKey, { n: item.detail ?? '0' })
      : item.key === 'ondevice'
        ? t(`ready.ondevice.${item.detail ?? 'none'}` as MessageKey)
        : t(`ready.${item.key}.${item.state}` as MessageKey, { date: when })
  return (
    <li className={`ready__row ready__row--${item.state}`}>
      <span className="mono ready__state">{t(`ready.state.${item.state}`)}</span>
      <div className="ready__body">
        <h2 className="ready__name">{t(`ready.name.${item.key}`)}</h2>
        <p className="muted">{text}</p>
        {item.state !== 'ok' && LINK[item.key] && (
          <a className="btn" href={LINK[item.key]}>
            {t(`ready.go.${item.key}` as MessageKey)}
          </a>
        )}
        {item.key === 'printed' && item.state === 'ok' && (
          <a className="btn btn--quiet" href="#/print">
            {t('ready.go.printed')}
          </a>
        )}
        {item.key === 'ondevice' && item.detail === 'downloadable' && <DownloadNano />}
      </div>
    </li>
  )
}

/** Download Gemini Nano: needs a click (user gesture) and a connection. Can take minutes. */
function DownloadNano() {
  const { t } = useI18n()
  const online = useConnection() !== 'offline'
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'busy'; pct: number } | { kind: 'done' } | { kind: 'failed'; detail: string }>({ kind: 'idle' })
  if (!online) return null
  async function go() {
    setState({ kind: 'busy', pct: 0 })
    try {
      const { prepareOnDevice } = await import('../../ai/nano')
      await prepareOnDevice((f) => setState({ kind: 'busy', pct: Math.round(f * 100) }))
      const { warmUpNano } = await import('../../ai/warmup')
      await warmUpNano('after-download')
      setState({ kind: 'done' })
    } catch (e) {
      setState({ kind: 'failed', detail: e instanceof Error ? e.message : String(e) })
    }
  }
  return (
    <div className="log__actions" role="status">
      {state.kind === 'idle' && (
        <button type="button" className="btn" onClick={() => void go()}>
          {t('ready.download')}
        </button>
      )}
      {state.kind === 'busy' && <span className="mono">{t('ready.downloading', { pct: String(state.pct) })}</span>}
      {state.kind === 'done' && <span className="mono">{t('ready.downloaded')}</span>}
      {state.kind === 'failed' && (
        <span className="muted pack__err">
          <ErrorNote message={t('ready.downloadFailed')} detail={state.detail} />
        </span>
      )}
    </div>
  )
}
