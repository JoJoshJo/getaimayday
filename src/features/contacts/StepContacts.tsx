/** One tap to your contacts from every plan step (MUST #8 + Session 4 brief). */
import { useRef } from 'react'
import { useI18n } from '../../i18n'
import type { PlanStep } from '../../plans/schema'
import { hasContact, STEP_CONTACT, telHref } from '../setup/model'
import { useSetup } from '../setup/useSetup'
import { ContactsCard } from './ContactsCard'

export function StepContacts({ step }: { step: PlanStep }) {
  const { t } = useI18n()
  const { contacts } = useSetup()
  const dialog = useRef<HTMLDialogElement>(null)
  const role = STEP_CONTACT[step.id]
  const direct = role ? contacts?.[role] : undefined

  return (
    <>
      {role && hasContact(direct) && direct!.phone && (
        <a className="btn btn--strong" href={telHref(direct!.phone)}>
          {t('contacts.call')} {t(`contacts.role.${role}`)} · {direct!.phone}
        </a>
      )}
      <button type="button" className="btn" onClick={() => dialog.current?.showModal()}>
        {t('contacts.open')}
      </button>
      <dialog ref={dialog} className="sheet" aria-labelledby={`sheet-${step.id}`}>
        <div className="sheet__head">
          <h2 id={`sheet-${step.id}`} className="mono">
            {t('contacts.title')}
          </h2>
          <button type="button" className="btn" onClick={() => dialog.current?.close()}>
            {t('contacts.close')}
          </button>
        </div>
        <ContactsCard contacts={contacts} compact />
      </dialog>
    </>
  )
}
