import { useI18n } from '../../i18n'
import { INCIDENTS, type Incident } from '../../plans/incidents'
import { ICON_STROKE, INCIDENT_ICON } from '../../ui/icons'

/** Incident tiles: one soft tinted card per incident, with its icon. Only incidents with a plan. */
export function IncidentTiles({ available, onPick }: { available: Set<Incident>; onPick: (i: Incident) => void }) {
  const { t } = useI18n()
  return (
    <ul className="tiles">
      {INCIDENTS.filter((i) => available.has(i)).map((i) => {
        const Icon = INCIDENT_ICON[i]
        return (
        <li key={i}>
          <button type="button" className="tile" data-tone={i} onClick={() => onPick(i)}>
            <Icon className="tile__icon" aria-hidden="true" strokeWidth={ICON_STROKE} />
            <span className="tile__title">{t(`incident.${i}`)}</span>
            <span className="tile__desc">{t(`tile.${i}`)}</span>
            <span className="tile__go mono" aria-hidden="true">
              →
            </span>
          </button>
        </li>
        )
      })}
    </ul>
  )
}
