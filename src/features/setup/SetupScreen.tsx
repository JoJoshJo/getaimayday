/**
 * #/setup: business profile + emergency contacts (MUST #8). Saved on this device
 * only (IndexedDB). On calm days; the Offline Pack is built from this.
 */
import { useState } from 'react'
import { useI18n } from '../../i18n'
import {
  BACKUPS,
  BUSINESS_TYPES,
  CONTACT_ROLES,
  COUNTRIES,
  EMPTY_CONTACT,
  EMPTY_PROFILE,
  SAMPLE_CONTACTS,
  SAMPLE_PROFILE,
  type Contact,
  type ContactRole,
  type Contacts,
  type Profile,
} from './model'
import { saveContacts, saveProfile, useSetup } from './useSetup'

export function SetupScreen() {
  const { t } = useI18n()
  const { profile, contacts } = useSetup()
  if (profile === undefined || contacts === undefined) return <p className="screen muted">{t('log.loading')}</p>
  // Loaded once; after that the form owns the values until Save.
  return <SetupForm initialProfile={profile ?? EMPTY_PROFILE} initialContacts={contacts ?? {}} />
}

function SetupForm({ initialProfile, initialContacts }: { initialProfile: Profile; initialContacts: Contacts }) {
  const { t } = useI18n()
  const [p, setP] = useState<Profile>(initialProfile)
  const [c, setC] = useState<Contacts>(initialContacts)
  const [saved, setSaved] = useState<'no' | 'yes' | 'error'>('no')

  const setField = <K extends keyof Profile>(k: K, v: Profile[K]) => {
    setSaved('no')
    setP((x) => ({ ...x, [k]: v }))
  }
  const setContact = (role: ContactRole, k: keyof Contact, v: string) => {
    setSaved('no')
    setC((x) => ({ ...x, [role]: { ...EMPTY_CONTACT, ...x[role], [k]: v } }))
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    try {
      await saveProfile(p)
      await saveContacts(c)
      setSaved('yes')
    } catch (err) {
      console.warn('[AIMayday] setup not saved', err)
      setSaved('error')
    }
  }

  const text = (k: 'name' | 'city' | 'staff' | 'email_provider' | 'backups_where', type = 'text') => (
    <label className="field">
      <span className="field__label mono">{t(`setup.f.${k}`)}</span>
      <input className="input" type={type} value={p[k]} onChange={(e) => setField(k, e.target.value)} autoComplete="off" />
    </label>
  )

  return (
    <form className="screen setup" onSubmit={onSave} aria-labelledby="setup-title">
      <p className="kicker mono">{t('setup.kicker')}</p>
      <h1 id="setup-title" className="screen__title">
        {t('setup.title')}
      </h1>
      <p className="muted setup__intro">{t('setup.intro')}</p>

      {import.meta.env.DEV && (
        <p>
          <button
            type="button"
            className="btn btn--quiet"
            onClick={() => {
              setP(SAMPLE_PROFILE)
              setC(SAMPLE_CONTACTS)
              setSaved('no')
            }}
          >
            Dev only: fill with fake sample data (Sunrise Dental)
          </button>
        </p>
      )}

      <fieldset className="setup__group">
        <legend className="mono setup__legend">{t('setup.business')}</legend>
        {text('name')}
        <label className="field">
          <span className="field__label mono">{t('setup.f.type')}</span>
          <select className="input" value={p.type} onChange={(e) => setField('type', e.target.value as Profile['type'])}>
            {BUSINESS_TYPES.map((v) => (
              <option key={v} value={v}>
                {t(`setup.type.${v}`)}
              </option>
            ))}
          </select>
        </label>
        {text('city')}
        <label className="field">
          <span className="field__label mono">{t('setup.f.country')}</span>
          <select className="input" value={p.country} onChange={(e) => setField('country', e.target.value as Profile['country'])}>
            {COUNTRIES.map((v) => (
              <option key={v} value={v}>
                {t(`setup.country.${v}`)}
              </option>
            ))}
          </select>
        </label>
        {text('staff')}
        {text('email_provider')}
        <label className="field">
          <span className="field__label mono">{t('setup.f.key_systems')}</span>
          <textarea className="input input--area" rows={2} value={p.key_systems} onChange={(e) => setField('key_systems', e.target.value)} placeholder={t('setup.keySystemsHint')} />
        </label>
        <label className="field">
          <span className="field__label mono">{t('setup.f.backups')}</span>
          <select className="input" value={p.backups} onChange={(e) => setField('backups', e.target.value as Profile['backups'])}>
            {BACKUPS.map((v) => (
              <option key={v} value={v}>
                {t(`setup.backups.${v}`)}
              </option>
            ))}
          </select>
        </label>
        {text('backups_where')}
      </fieldset>

      <fieldset className="setup__group">
        <legend className="mono setup__legend">{t('contacts.title')}</legend>
        <p className="muted">{t('setup.contactsIntro')}</p>
        {CONTACT_ROLES.map((role) => (
          <div key={role} className="setup__contact" role="group" aria-labelledby={`role-${role}`}>
            <h2 id={`role-${role}`} className="setup__role">
              {t(`contacts.role.${role}`)}
            </h2>
            {(['name', 'phone', 'email', 'notes'] as const).map((k) => (
              <label key={k} className="field">
                <span className="field__label mono">{t(`setup.c.${k}`)}</span>
                <input
                  className="input"
                  type={k === 'phone' ? 'tel' : k === 'email' ? 'email' : 'text'}
                  value={c[role]?.[k] ?? ''}
                  onChange={(e) => setContact(role, k, e.target.value)}
                  autoComplete="off"
                />
              </label>
            ))}
          </div>
        ))}
      </fieldset>

      <div className="setup__save">
        <button type="submit" className="btn btn--strong">
          {t('setup.save')}
        </button>
        <span role="status" className="mono">
          {saved === 'yes' ? t('setup.saved') : saved === 'error' ? t('setup.notSaved') : ''}
        </span>
      </div>
    </form>
  )
}
