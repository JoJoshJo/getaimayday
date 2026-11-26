import { lazy, Suspense } from 'react'
import { useRoute } from './app/router'
import { Home } from './features/home/Home'
import { IncidentView } from './features/incident/IncidentView'
import { IncidentList } from './features/log/IncidentList'
import { ContactsScreen } from './features/contacts/ContactsScreen'
import { StepContacts } from './features/contacts/StepContacts'
import { StepAsk } from './features/ask/StepAsk'
import { BackOnline } from './features/online/BackOnline'
import { SetupScreen } from './features/setup/SetupScreen'
import { PackScreen } from './features/pack/PackScreen'
import { ReadyScreen } from './features/ready/ReadyScreen'
import { useReadiness } from './features/ready/useReadiness'
import { PrintPlans } from './features/print/PrintPlans'
import { DemoSetup } from './features/demo/DemoSetup'
import { FixitList, FixitView } from './features/fixit/FixitScreens'
import { useDemo } from './features/demo/demo'
import { useI18n } from './i18n'
import { LangToggle, StatusChip, Wordmark } from './ui/components'
import { useConnection } from './ui/useConnection'

const Styleguide = lazy(() => import('./features/styleguide/Styleguide'))
// Hidden dev page; its chunk pulls in Firebase. The main shell never loads Firebase.
const Lab = lazy(() => import('./features/lab/Lab'))

function TopBar() {
  const connection = useConnection()
  const ready = useReadiness()
  const { t } = useI18n()
  return (
    <header className="topbar">
      <a className="topbar__home" href="#/">
        <Wordmark />
      </a>
      <nav className="topbar__nav mono" aria-label={t('nav.label')}>
        <a href="#/ready">{t('nav.ready')}</a>
        <a href="#/contacts">{t('nav.contacts')}</a>
        <a href="#/incidents">{t('nav.incidents')}</a>
        <a href="#/pack">{t('nav.pack')}</a>
        <a href="#/setup">{t('nav.setup')}</a>
      </nav>
      <div className="topbar__end">
        <StatusChip state={connection} ready={ready} />
        <LangToggle />
      </div>
    </header>
  )
}

export default function App() {
  const { t } = useI18n()
  const route = useRoute()
  const demo = useDemo()

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
  if (route.parts[0] === 'incident' && route.parts[1]) content = <IncidentView id={route.parts[1]} stepExtras={(step, incidentId, plan) => (
        <>
          <StepContacts step={step} />
          <StepAsk key={step.id} plan={plan} step={step} incidentId={incidentId} />
        </>
      )}
      logExtras={(record, plan) => <BackOnline record={record} plan={plan} />} />
  else if (route.path === '/incidents') content = <IncidentList />
  else if (route.path === '/contacts') content = <ContactsScreen />
  else if (route.path === '/setup') content = <SetupScreen />
  else if (route.path === '/pack') content = <PackScreen />
  else if (route.path === '/ready') content = <ReadyScreen />
  else if (route.path === '/print') content = <PrintPlans />
  else if (route.path === '/demo-setup') content = <DemoSetup />
  else if (route.parts[0] === 'fixit' && route.parts[1]) content = <FixitView key={route.parts[1]} id={route.parts[1]} />
  else if (route.path === '/fixit') content = <FixitList />

  return (
    <div className="page">
      <TopBar />
      {demo && (
        <p className="demo-banner mono" role="note">
          {t('demo.banner')}
        </p>
      )}
      <main className="main">{content}</main>
      <footer className="footer">
        <p>{t('disclaimer')}</p>
      </footer>
    </div>
  )
}
