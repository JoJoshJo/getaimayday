/**
 * Shows an Offline Pack search result (no AI model at answer time).
 * Confident → one answer with the "Offline Pack" badge, its plan step and source.
 * Not sure  → the 3 closest questions + "call your IT contact".
 */
import { useI18n } from '../../i18n'
import type { PackMatch } from '../../pack/match'
import { SourceBadge } from '../../ui/components'
import { hasContact, telHref, type ContactRole, type Contacts } from '../setup/model'

function CallButton({ role, contacts }: { role: ContactRole; contacts: Contacts }) {
  const { t } = useI18n()
  const c = contacts[role]
  if (!c || !hasContact(c) || !c.phone.trim()) return null
  return (
    <a className="btn" href={telHref(c.phone)}>
      {t('pack.call', { who: t(`contacts.role.${role}`), phone: c.phone })}
    </a>
  )
}

/** `contacts` comes from the parent (already loaded), so call buttons show at once. */
export function PackAnswer({ match, contacts }: { match: PackMatch; contacts: Contacts }) {
  const { t } = useI18n()
  const it = contacts.it_vendor

  if (match.confident) {
    const a = match.top[0]
    return (
      <div className="packans" role="status">
        <p className="packans__head">
          <SourceBadge source="pack" /> <span className="mono muted">{a.question}</span>
        </p>
        <p className="packans__text">{a.answer}</p>
        <p className="packans__meta mono">
          {t('plan.source')}:{' '}
          <a href={a.source_url} target="_blank" rel="noreferrer">
            {a.source_name}
          </a>
        </p>
        {a.contact_role && (
          <div className="log__actions">
            <CallButton role={a.contact_role} contacts={contacts} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="packans" role="status">
      <p className="packans__head">
        <SourceBadge source="pack" /> {match.top.length ? t('pack.notSure') : t('pack.nothing')}
      </p>
      {match.top.length > 0 && (
        <ul className="packans__list">
          {match.top.map((a) => (
            <li key={a.id}>
              <details>
                <summary>{a.question}</summary>
                <p>{a.answer}</p>
              </details>
            </li>
          ))}
        </ul>
      )}
      <div className="log__actions">
        {it && hasContact(it) && it.phone.trim() ? (
          <CallButton role="it_vendor" contacts={contacts} />
        ) : (
          <a className="btn" href="#/contacts">
            {t('pack.openContacts')}
          </a>
        )}
      </div>
    </div>
  )
}
