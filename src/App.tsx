import { useEffect, useState } from 'react'
import { PlanView } from './features/incident/PlanView'
import { useI18n } from './i18n'
import { LANGUAGES } from './i18n/messages'
import { getPlan } from './plans'

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

function LangToggle() {
  const { lang, setLang, t } = useI18n()
  return (
    <div className="lang-toggle" role="group" aria-label={t('lang.label')}>
      {LANGUAGES.map((l) => (
        <button key={l} lang={l} aria-pressed={lang === l} onClick={() => setLang(l)} title={t(`lang.${l}`)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

export default function App() {
  const { lang, t } = useI18n()
  const online = useOnline()
  const plan = getPlan(lang, 'ransomware')

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>{t('app.name')}</h1>
          <p>{t('app.tagline')}</p>
        </div>
        <span className="status" role="status">
          {online ? t('status.online') : t('status.offline')}
        </span>
        <LangToggle />
      </header>

      <main>{plan && <PlanView plan={plan} />}</main>

      <footer className="disclaimer">{t('disclaimer')}</footer>
    </div>
  )
}
