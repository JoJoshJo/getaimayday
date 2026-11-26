import { lazy, Suspense } from 'react'
import { useRoute } from './app/router'
import { Home } from './features/home/Home'
import { IncidentView } from './features/incident/IncidentView'
import { IncidentList } from './features/log/IncidentList'
import { useI18n } from './i18n'
import { LangToggle, StatusChip, Wordmark } from './ui/components'
import { useConnection } from './ui/useConnection'

const Styleguide = lazy(() => import('./features/styleguide/Styleguide'))
// Hidden dev page; its chunk pulls in Firebase. The main shell never loads Firebase.
const Lab = lazy(() => import('./features/lab/Lab'))

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
  const { t } = useI18n()
  const route = useRoute()

  if (route.path === '/styleguide' || route.path === '/lab') {
    return (
      <Suspense fallback={null}>
        {route.path === '/lab' ? (
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

  let content = <Home />
  if (route.parts[0] === 'incident' && route.parts[1]) content = <IncidentView id={route.parts[1]} />
  else if (route.path === '/incidents') content = <IncidentList />

  return (
    <div className="page">
      <TopBar />
      <main className="main">{content}</main>
      <footer className="footer">
        <p>{t('disclaimer')}</p>
      </footer>
    </div>
  )
}
