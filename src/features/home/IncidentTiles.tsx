import { useI18n } from '../../i18n'
import { INCIDENTS, type Incident } from '../../plans/incidents'

/** Incident "tiles": a ruled list of big rows (rules, not cards). Only incidents with a plan. */
export function IncidentTiles({ available, onPick }: { available: Set<Incident>; onPick: (i: Incident) => void }) {
  const { t } = useI18n()
  return (
    <ul className="tiles">
      {INCIDENTS.filter((i) => available.has(i)).map((i) => (
        <li key={i}>
          <button type="button" className="tile" onClick={() => onPick(i)}>
            <span className="tile__title">{t(`incident.${i}`)}</span>
            <span className="tile__desc">{t(`tile.${i}`)}</span>
            <span className="tile__go mono" aria-hidden="true">
              →
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
