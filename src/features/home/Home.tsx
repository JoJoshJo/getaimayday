/**
 * Home (MASTER §6 MUST #4): "Something's wrong" + short description → plan.
 *
 *   on-device AI "available" → router.classify (Firebase AI Logic, ONLY_ON_DEVICE)
 *   else                     → keyword match (no model)
 *   no clear answer          → the user picks a tile
 *
 * The tiles are always on screen and always work: the checklist never waits on AI.
 * The description never leaves the device (on-device model or plain matching).
 */
import { useEffect, useRef, useState } from 'react'
import { router, type Source } from '../../ai/router'
import { onDeviceAvailability } from '../../ai/warmup'
import { useI18n } from '../../i18n'
import { CLASSIFY_TO_INCIDENT, incidentsWithPlan, type Incident } from '../../plans/incidents'
import { DoNot, SourceBadge } from '../../ui/components'
import { startIncident } from '../incident/start'
import { OpenIncidents } from '../log/OpenIncidents'
import { FixitTiles } from '../fixit/FixitScreens'
import { IncidentTiles } from './IncidentTiles'
import { keywordMatch } from './keywords'

type Status =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'unsure'; source: Source }
  | { kind: 'found'; incident: Incident; source: Source }

const openPlan = (incident: Incident, by: Source | 'tile') => void startIncident(incident, by)

export function Home() {
  const { t } = useI18n()
  const [text, setText] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const run = useRef(0)
  const tilesRef = useRef<HTMLHeadingElement>(null)
  const available = incidentsWithPlan()

  // Leaving the page cancels any answer still on its way.
  useEffect(
    () => () => {
      run.current++
    },
    [],
  )

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const id = ++run.current
    const description = text.trim()
    if (!description) {
      tilesRef.current?.focus()
      return
    }

    const useNano = (await onDeviceAvailability()) === 'available'
    if (id !== run.current) return
    if (useNano) {
      setStatus({ kind: 'reading' })
      const r = await router.classify(description)
      if (id !== run.current) return
      const incident = r.source === 'on-device' ? CLASSIFY_TO_INCIDENT[r.data] : null
      if (incident && available.has(incident)) {
        setStatus({ kind: 'found', incident, source: 'on-device' })
        openPlan(incident, 'on-device')
        return
      }
      if (r.source === 'on-device') {
        setStatus({ kind: 'unsure', source: 'on-device' })
        tilesRef.current?.focus()
        return
      }
      // On-device failed: fall through to keywords (r.error is in the router result).
    }
    const k = keywordMatch(description, available)
    if (k) {
      setStatus({ kind: 'found', incident: k.incident, source: 'checklist' })
      openPlan(k.incident, 'checklist')
    } else {
      setStatus({ kind: 'unsure', source: 'checklist' })
      tilesRef.current?.focus()
    }
  }

  return (
    <div className="home">
      <OpenIncidents />
      <section className="home__lead" aria-labelledby="home-title">
        <p className="kicker mono">{t('home.kicker')}</p>
        <h1 id="home-title" className="home__title">
          {t('home.title')}
        </h1>
        <DoNot>{t('home.cleanDevice')}</DoNot>

        <form className="home__form" onSubmit={onSubmit}>
          <label className="field">
            <span className="field__label mono">{t('home.describe')}</span>
            <textarea
              className="input input--area"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('home.placeholder')}
              maxLength={2000}
            />
          </label>
          <p className="field__hint">{t('home.private')}</p>
          <div>
            <button type="submit" className="btn-mayday" disabled={status.kind === 'reading'}>
              {t('action.somethingWrong')}
            </button>
          </div>
          <div className="home__status" role="status" aria-live="polite">
            {status.kind === 'reading' && <p className="mono">{t('home.reading')}</p>}
            {status.kind === 'unsure' && (
              <p className="home__line">
                <SourceBadge source={status.source} /> {t('home.unsure')}
              </p>
            )}
            {status.kind === 'found' && (
              <p className="home__line">
                <SourceBadge source={status.source} /> {t('home.opening', { incident: t(`incident.${status.incident}`) })}
              </p>
            )}
          </div>
        </form>
      </section>

      <section className="home__tiles" aria-labelledby="tiles-title">
        <h2 id="tiles-title" ref={tilesRef} tabIndex={-1} className="mono home__tiles-title">
          {t('home.tiles')}
        </h2>
        <IncidentTiles available={available} onPick={(i) => openPlan(i, 'tile')} />
        <p className="home__more">
          <a href="#/incidents">{t('log.past')}</a>
        </p>
      </section>

      <section className="home__tiles" aria-labelledby="fixits-title">
        <h2 id="fixits-title" className="mono home__tiles-title">
          {t('fixit.homeTitle')}
        </h2>
        <FixitTiles />
      </section>
    </div>
  )
}
