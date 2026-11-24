import { lazy, Suspense, useEffect, useState } from 'react'
import { PlanView } from './features/incident/PlanView'
import { useI18n } from './i18n'
import { getPlan } from './plans'
import { LangToggle, StatusChip, Wordmark } from './ui/components'
import { useConnection } from './ui/useConnection'

const Styleguide = lazy(() => import('./features/styleguide/Styleguide'))
// Hidden dev page; its chunk pulls in Firebase. The main shell never loads Firebase.
const Lab = lazy(() => import('./features/lab/Lab'))

/** Tiny hash router: '#/styleguide', '#/lab' (hidden), anything else → app. Works offline. */
function useRoute(): string {
  const read = () => window.location.hash.replace(/^#/, '') || '/'
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const on = () => setRoute(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

function TopBar() {
  const connection = useConnection()
  return (
    <header className="topbar">
      <a className="topbar__home" href="#/">
        <Wordmark />
      </a>
      <div className="topbar__end">
        <StatusChip state={connection} />
        <LangToggle />
      </div>
    </header>
  )
}

export default function App() {
  const { lang, t } = useI18n()
  const route = useRoute()

  if (route === '/styleguide' || route === '/lab') {
    return (
      <Suspense fallback={null}>
        {route === '/lab' ? (
          <div className="page">
            <TopBar />
            <Lab />
          </div>
        ) : (
          <Styleguide />
        )}
      </Suspense>
    )
  }

  const plan = getPlan(lang, 'ransomware')
  return (
    <div className="page">
      <TopBar />
      <main className="main">{plan && <PlanView plan={plan} />}</main>
      <footer className="footer">
        <p>{t('disclaimer')}</p>
      </footer>
    </div>
  )
}
