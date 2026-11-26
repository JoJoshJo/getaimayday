/** Emergency contacts card (MUST #8): offline, one tap to call, email or copy. */
import { ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { useI18n } from '../../i18n'
import { CONTACT_ROLES, FIXED_LINKS, hasContact, telHref, type Contacts } from '../setup/model'

export function ContactsCard({ contacts, compact = false }: { contacts: Contacts | null | undefined; compact?: boolean }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState<string | null>(null)
  const filled = CONTACT_ROLES.filter((r) => hasContact(contacts?.[r]))

  async function copy(role: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(role)
    } catch {
      setCopied(null)
    }
  }

  return (
    <div className="contacts">
      {filled.length === 0 && (
        <p className="empty">
          {t('contacts.empty')} <a href="#/setup">{t('contacts.addNow')}</a>
        </p>
      )}
      <ul className="contacts__list">
        {filled.map((role) => {
          const c = contacts![role]!
          return (
            <li key={role} className="contacts__row">
              <span className="mono contacts__role">{t(`contacts.role.${role}`)}</span>
              <span className="contacts__name">{c.name}</span>
              <span className="contacts__actions">
                {c.phone && (
                  <a className="btn btn--strong" href={telHref(c.phone)}>
                    {t('contacts.call')} {c.phone}
                  </a>
                )}
                {c.email && (
                  <a className="btn" href={`mailto:${c.email}`}>
                    {t('contacts.email')}
                  </a>
                )}
                {(c.phone || c.email) && (
                  <button type="button" className="btn btn--quiet" onClick={() => void copy(role, [c.name, c.phone, c.email].filter(Boolean).join(' · '))}>
                    {copied === role ? t('contacts.copied') : t('contacts.copy')}
                  </button>
                )}
              </span>
              {!compact && c.notes && <span className="contacts__notes muted">{c.notes}</span>}
            </li>
          )
        })}
        {FIXED_LINKS.map((l) => (
          <li key={l.key} className="contacts__row">
            <span className="mono contacts__role">{t(`contacts.fixed.${l.key}`)}</span>
            <span className="contacts__name">{t(`contacts.fixedDesc.${l.key}`)}</span>
            <span className="contacts__actions">
              <a className="btn" href={l.url} target="_blank" rel="noopener noreferrer">
                {new URL(l.url).host} <ExternalLink className="inline-icon" aria-hidden="true" size={15} strokeWidth={1.75} />
              </a>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
