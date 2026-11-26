import { useI18n } from '../../i18n'
import { useSetup } from '../setup/useSetup'
import { ContactsCard } from './ContactsCard'

/** #/contacts */
export function ContactsScreen() {
  const { t } = useI18n()
  const { contacts } = useSetup()
  return (
    <section className="screen" aria-labelledby="contacts-title">
      <p className="kicker mono">{t('contacts.kicker')}</p>
      <h1 id="contacts-title" className="screen__title">
        {t('contacts.title')}
      </h1>
      <ContactsCard contacts={contacts} />
      <p>
        <a href="#/setup">{t('contacts.edit')}</a>
      </p>
    </section>
  )
}
