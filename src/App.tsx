import { lazy, Suspense } from 'react'
import { useRoute } from './app/router'
import { Home } from './features/home/Home'
import { PlanView } from './features/incident/PlanView'
import { useI18n } from './i18n'
import { getPlan } from './plans'
import { isIncident, planIdFor } from './plans/incidents'
import { LangToggle, SourceBadge, StatusChip, Wordmark } from './ui/components'
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

function ChosenBy({ by }: { by: string | null }) {
  const { t } = useI18n()
  if (by !== 'on-device' && by !== 'checklist' && by !== 'tile') return null
  return (
    <p className="chosen">
      {by !== 'tile' && <SourceBadge source={by} />} <span>{t(`plan.chosenBy.${by}`)}</span>{' '}
      <a href="#/">{t('plan.notRight')}</a>
    </p>
  )
}

export default function App() {
  const { lang, t } = useI18n()
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
  if (route.parts[0] === 'plan' && isIncident(route.parts[1])) {
    const plan = getPlan(lang, planIdFor(route.parts[1]))
    if (plan)
      content = (
        <>
          <ChosenBy by={route.query.get('by')} />
          <PlanView key={plan.id} plan={plan} />
        </>
      )
  }

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
