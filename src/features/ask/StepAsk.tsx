/**
 * "Ask a question" under each plan step. On-device AI → Offline Pack → call your
 * contact (see answer.ts). The plan step itself never waits on this.
 * On fix-its (no incident) the SDK may answer with cloud AI when there is no
 * on-device model (PREFER_ON_DEVICE); a notice under the box says so.
 */
import { useRef, useState } from 'react'
import { router } from '../../ai/router'
import { askMode, mayAutoCloud } from '../../ai/modes'
import { onDeviceAvailability } from '../../ai/warmup'
import { useI18n } from '../../i18n'
import { loadPack } from '../../pack/store'
import type { PackLang } from '../../pack/schema'
import type { AskGuide } from '../../ai/prompts/ask'
import type { PlanStep } from '../../plans/schema'
import { store } from '../../storage/localAdapter'
import { SourceBadge } from '../../ui/components'
import { PackAnswer } from '../pack/PackAnswer'
import { hasContact, STEP_CONTACT, telHref } from '../setup/model'
import { useSetup } from '../setup/useSetup'
import { answerQuestion, type AskAnswer } from './answer'

/** `incidentId` is set inside an incident (questions are logged); fix-its have none. */
export function StepAsk({ plan, step, incidentId }: { plan: AskGuide; step: PlanStep; incidentId?: string }) {
  const { t, lang } = useI18n()
  const { contacts } = useSetup()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<AskAnswer | null>(null)
  const run = useRef(0)
  const autoCloud = mayAutoCloud(askMode(plan))

  async function onAsk(e: React.FormEvent) {
    e.preventDefault()
    const question = q.trim()
    if (!question) return
    const id = ++run.current
    setBusy(true)
    setRes(null)
    const a = await answerQuestion(question, plan, step, lang as PackLang, {
      availability: onDeviceAvailability,
      ask: (p, mode) => router.ask(p, mode),
      loadPack,
      online: () => navigator.onLine,
    })
    if (id !== run.current) return
    setRes(a)
    setBusy(false)
    const source = a.kind === 'ai' ? a.source : a.kind === 'pack' ? 'pack' : 'checklist'
    if (incidentId) void store.addEvent(incidentId, { kind: 'ai', job: 'ask', source, question })
  }

  if (!open)
    return (
      <button type="button" className="btn" onClick={() => setOpen(true)}>
        {t('ask.open')}
      </button>
    )

  // Who to call when there is no answer: this step's contact, else the IT contact.
  const role = STEP_CONTACT[step.id] ?? 'it_vendor'
  const c = contacts?.[role]

  return (
    <div className="ask">
      <form className="ask__form" onSubmit={onAsk}>
        <label className="field">
          <span className="field__label mono">{t('ask.label')}</span>
          <input name="question" className="input" value={q} onChange={(e) => setQ(e.target.value)} maxLength={500} autoComplete="off" autoFocus />
        </label>
        <div className="log__actions">
          <button type="submit" className="btn btn--strong" disabled={busy}>
            {t('ask.submit')}
          </button>
          <button
            type="button"
            className="btn btn--quiet"
            onClick={() => {
              run.current++
              setOpen(false)
              setRes(null)
              setBusy(false)
            }}
          >
            {t('ask.close')}
          </button>
        </div>
        <p className="field__hint">{t(autoCloud ? 'ask.cloudNotice' : 'ask.private')}</p>
      </form>
      <div role="status" aria-live="polite">
        {busy && <p className="mono">{t('ask.reading')}</p>}
        {res?.kind === 'ai' && (
          <div className="packans">
            <p className="packans__head">
              <SourceBadge source={res.source} /> <span className="mono muted">{t('ask.fromStep')}</span>
            </p>
            <p className="packans__text">{res.text}</p>
            <p className="muted">{t('ask.checkWith')}</p>
          </div>
        )}
        {res?.kind === 'pack' && <PackAnswer match={res.match} contacts={contacts ?? {}} />}
        {res?.kind === 'none' && (
          <div className="packans">
            <p className="packans__head">
              <SourceBadge source="checklist" /> {res.reason === 'no-pack' ? t('ask.noPack') : res.reason === 'no-ai' ? t('ask.noAi') : t('pack.nothing')}
            </p>
            <div className="log__actions">
              {c && hasContact(c) && c.phone.trim() ? (
                <a className="btn" href={telHref(c.phone)}>
                  {t('pack.call', { who: t(`contacts.role.${role}`), phone: c.phone })}
                </a>
              ) : (
                <a className="btn" href="#/contacts">
                  {t('pack.openContacts')}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
