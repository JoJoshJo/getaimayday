/**
 * One-tap call buttons under any answer that tells the user to contact someone
 * (Session 10): Pack answers, and Ask answers on plans and fix-its (on-device or cloud).
 * Saved contact with a phone → call button; email only → email button;
 * not saved → "Add this contact" (to the contacts form on Setup).
 */
import { useI18n } from '../../i18n'
import { hasContact, telHref, type ContactRole, type Contacts } from '../setup/model'

export function AnswerContacts({ roles, contacts }: { roles: ContactRole[]; contacts: Contacts | null | undefined }) {
  const { t } = useI18n()
  if (roles.length === 0) return null
  return (
    <div className="log__actions answer__contacts">
      {roles.map((role) => {
        const c = contacts?.[role]
        const who = t(`contacts.role.${role}`)
        if (c && hasContact(c) && c.phone.trim())
          return (
            <a key={role} className="btn" href={telHref(c.phone)}>
              {t('pack.call', { who, phone: c.phone })}
            </a>
          )
        if (c && hasContact(c) && c.email.trim())
          return (
            <a key={role} className="btn" href={`mailto:${c.email}`}>
              {t('answer.email', { who })}
            </a>
          )
        return (
          <a key={role} className="btn btn--quiet" href={`#/setup`}>
            {t('answer.addContact', { who })}
          </a>
        )
      })}
    </div>
  )
}
