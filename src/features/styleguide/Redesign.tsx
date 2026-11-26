/**
 * Session 9 · redesign PREVIEWS for J to pick from (styleguide only).
 *
 * Three directions (A calm helper, B Google-ish but ours, C warm and human) render the
 * SAME preview markup: Home, one plan step, the photo confirm panel and the Pack search.
 * Only the CSS (redesign.css, scoped to .rd[data-dir]) and the tokens differ.
 * Static, no app logic: nothing here reads storage, calls AI or changes the real screens.
 */
import '@fontsource-variable/google-sans-flex/rond.css'
import '@fontsource-variable/google-sans-code/wght.css'
import {
  BookOpen,
  Check,
  ChevronDown,
  Cloud,
  ExternalLink,
  KeyRound,
  Laptop,
  LifeBuoy,
  ListChecks,
  Lock,
  Mail,
  MailWarning,
  Monitor,
  Phone,
  Printer,
  Receipt,
  Search,
  ShieldAlert,
  Smartphone,
  Wifi,
  WifiOff,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useI18n } from '../../i18n'
import { getPlan } from '../../plans'
import { INCIDENTS, type Incident } from '../../plans/incidents'
import { FIXIT_TOPICS } from '../../fixits/schema'
import { redesignCss } from './redesignCss'
import './redesign.css'

export type Dir = 'a' | 'b' | 'c'
type Theme = 'light' | 'dark'

const INCIDENT_ICON: Record<Incident, LucideIcon> = {
  ransomware: Lock,
  bec: Receipt,
  phishing: MailWarning,
  'lost-device': Smartphone,
  outage: WifiOff,
}
const FIXIT_ICON: Record<(typeof FIXIT_TOPICS)[number], LucideIcon> = {
  wifi: Wifi,
  'email-send': Mail,
  'frozen-pc': Monitor,
  printer: Printer,
  'locked-account': KeyRound,
  power: Zap,
}

/** Preview-only words (not app copy yet). Same rules: plain, no "!", no em dashes. */
const P = {
  en: {
    more: 'More',
    noOpen: 'No open incidents. When something happens, start here.',
    frameHome: 'Home',
    frameStep: 'A plan step',
    frameConfirm: 'Photo: please confirm',
    framePack: 'Offline Pack search',
    ask: 'Ask a question about this step',
    contacts: 'Contacts',
    q: 'are my backups safe?',
    hitQ: 'How do I know if our backups are safe?',
    hitA: 'Do not plug a backup drive into any computer yet. Ask your IT contact to check the backups from a clean computer first.',
    days: '3 days',
    group: 'Not found',
    contact: 'Email in the note',
  },
  fr: {
    more: 'Plus',
    noOpen: 'Aucun incident ouvert. Si quelque chose arrive, commencez ici.',
    frameHome: 'Accueil',
    frameStep: 'Une étape du plan',
    frameConfirm: 'Photo : à confirmer',
    framePack: 'Recherche dans le Pack hors ligne',
    ask: 'Poser une question sur cette étape',
    contacts: 'Contacts',
    q: 'nos sauvegardes sont-elles sûres ?',
    hitQ: 'Comment savoir si nos sauvegardes sont intactes ?',
    hitA: 'Ne branchez encore aucun disque de sauvegarde. Demandez d’abord à votre contact informatique de les vérifier depuis un ordinateur sain.',
    days: '3 jours',
    group: 'Non trouvé',
    contact: 'E-mail dans la note',
  },
}

/** Same CSP-safe injection as applyTokens.ts (constructable stylesheet). */
function useRedesignTokens() {
  useEffect(() => {
    const css = redesignCss()
    if ('adoptedStyleSheets' in Document.prototype && 'replaceSync' in CSSStyleSheet.prototype) {
      const sheet = new CSSStyleSheet()
      sheet.replaceSync(css)
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
      return () => {
        document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== sheet)
      }
    }
    const el = document.createElement('style')
    el.textContent = css
    document.head.append(el)
    return () => el.remove()
  }, [])
}

// ---- switcher ----

export function RedesignSwitcher() {
  useRedesignTokens()
  const { lang, setLang } = useI18n()
  const [dir, setDir] = useState<Dir>('a')
  const [theme, setTheme] = useState<Theme>(() => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  return (
    <section className="rdsw" aria-labelledby="rdsw-title">
      <div className="rdsw__bar page">
        <h2 id="rdsw-title" className="rdsw__title">
          Redesign preview · Session 9
        </h2>
        <p className="rdsw__lede">Three directions for J to choose from. Same screens, same words, only the look changes. Nothing here is live in the app yet.</p>
        <div className="rdsw__controls">
          <Seg label="Direction" value={dir} onChange={setDir} options={[['a', 'A · Calm helper'], ['b', 'B · Google-ish, but ours'], ['c', 'C · Warm and human']]} />
          <Seg label="Theme" value={theme} onChange={setTheme} options={[['light', 'Light'], ['dark', 'Dark']]} />
          <Seg label="Language" value={lang} onChange={(l) => setLang(l)} options={[['en', 'EN'], ['fr', 'FR']]} />
        </div>
      </div>
      <RedesignPreview dir={dir} theme={theme} />
    </section>
  )
}

function Seg<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="rdsw__seg" role="group" aria-label={label}>
      <span className="rdsw__seg-label">{label}</span>
      {options.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={value === v} data-value={v} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  )
}

// ---- the preview screens ----

export function RedesignPreview({ dir, theme }: { dir: Dir; theme: Theme }) {
  const { lang } = useI18n()
  const p = P[lang]
  return (
    <div className="rd" data-dir={dir} data-theme={theme} lang={lang}>
      <Frame id="home" title={p.frameHome}>
        <TopBar />
        <HomeScreen />
      </Frame>
      <Frame id="step" title={p.frameStep}>
        <StepScreen />
      </Frame>
      <Frame id="confirm" title={p.frameConfirm}>
        <ConfirmScreen />
      </Frame>
      <Frame id="pack" title={p.framePack}>
        <PackScreen />
      </Frame>
    </div>
  )
}

function Frame({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <div className="rd__frame" data-frame={id}>
      <p className="rd__frame-label">{title}</p>
      <div className="rd__screen">{children}</div>
    </div>
  )
}

function TopBar() {
  const { t, lang } = useI18n()
  const [open, setOpen] = useState(false)
  return (
    <header className="rd-top">
      <span className="rd-top__mark">
        <LifeBuoy aria-hidden="true" size={22} strokeWidth={1.75} />
        AIMayday
      </span>
      <nav className="rd-top__nav" aria-label={t('nav.label')}>
        <a href="#/styleguide" aria-current="page">
          {t('nav.home')}
        </a>
        <a href="#/styleguide">{t('nav.ready')}</a>
        <a href="#/styleguide">{t('nav.incidents')}</a>
        <div className="rd-top__more">
          <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {P[lang].more} <ChevronDown aria-hidden="true" size={16} />
          </button>
          {open && (
            <ul className="rd-top__menu">
              <li><a href="#/styleguide">{t('nav.contacts')}</a></li>
              <li><a href="#/styleguide">{t('nav.pack')}</a></li>
              <li><a href="#/styleguide">{t('nav.setup')}</a></li>
            </ul>
          )}
        </div>
      </nav>
      <div className="rd-top__end">
        <span className="rd-chip">
          <span className="rd-chip__dot" aria-hidden="true" />
          {t('status.offlineReady')}
        </span>
        <span className="rd-lang" aria-hidden="true">
          <span aria-pressed={lang === 'en'}>EN</span>
          <span aria-pressed={lang === 'fr'}>FR</span>
        </span>
      </div>
    </header>
  )
}

function Shapes() {
  // Direction B only (hidden by CSS elsewhere): flat geometric shapes, our own colors.
  return (
    <svg className="rd-shapes" viewBox="0 0 240 200" aria-hidden="true" focusable="false">
      <circle cx="170" cy="60" r="44" className="rd-shapes__a" />
      <path d="M40 200 A100 100 0 0 1 140 100 L140 200 Z" className="rd-shapes__b" />
      <rect x="150" y="128" width="84" height="44" rx="22" className="rd-shapes__c" />
    </svg>
  )
}

function HomeScreen() {
  const { t, lang } = useI18n()
  return (
    <div className="rd-home">
      <section className="rd-hero">
        <Shapes />
        <div className="rd-hero__body">
          <p className="rd-kicker">{t('home.kicker')}</p>
          <h1 className="rd-h1">{t('home.title')}</h1>
          <div className="rd-note rd-note--warn">
            <ShieldAlert aria-hidden="true" size={22} strokeWidth={1.75} />
            <p>{t('home.cleanDevice')}</p>
          </div>
          <label className="rd-field">
            <span className="rd-field__label">{t('home.describe')}</span>
            <textarea name="rd-description" className="rd-input rd-input--area" rows={3} placeholder={t('home.placeholder')} />
          </label>
          <div className="rd-actions">
            <button type="button" className="rd-btn rd-btn--mayday">
              {t('action.somethingWrong')}
            </button>
          </div>
          <p className="rd-hint">
            <Lock aria-hidden="true" size={16} strokeWidth={1.75} /> {t('home.private')}
          </p>
        </div>
      </section>

      <p className="rd-empty">{P[lang].noOpen}</p>

      <section className="rd-section">
        <h2 className="rd-h2">{t('home.tiles')}</h2>
        <ul className="rd-tiles">
          {INCIDENTS.map((i) => {
            const Icon = INCIDENT_ICON[i]
            return (
              <li key={i}>
                <a className="rd-tile" href="#/styleguide" data-tone={i}>
                  <Icon className="rd-tile__icon" aria-hidden="true" strokeWidth={1.75} />
                  <span className="rd-tile__title">{t(`incident.${i}`)}</span>
                  <span className="rd-tile__desc">{t(`tile.${i}`)}</span>
                </a>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="rd-section">
        <h2 className="rd-h2">{t('fixit.homeTitle')}</h2>
        <ul className="rd-tiles rd-tiles--small">
          {FIXIT_TOPICS.map((f) => {
            const Icon = FIXIT_ICON[f]
            return (
              <li key={f}>
                <a className="rd-tile rd-tile--small" href="#/styleguide" data-tone="fixit">
                  <Icon className="rd-tile__icon" aria-hidden="true" strokeWidth={1.75} />
                  <span className="rd-tile__title">{t(`fixit.topic.${f}`)}</span>
                </a>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function StepScreen() {
  const { t, lang } = useI18n()
  const plan = getPlan(lang, 'ransomware')!
  const done = plan.steps[0]
  const step = plan.steps[1]
  const total = plan.steps.length
  const Icon = INCIDENT_ICON.ransomware
  return (
    <div className="rd-plan" data-tone="ransomware">
      <div className="rd-plan__head">
        <Icon className="rd-plan__icon" aria-hidden="true" strokeWidth={1.75} />
        <div>
          <p className="rd-kicker">{t('plan.kicker', { version: plan.version })}</p>
          <h1 className="rd-h1 rd-h1--plan">{t(`incident.${plan.incident}`)}</h1>
        </div>
      </div>
      <div className="rd-progress">
        <span className="rd-progress__text">{t('plan.progress', { done: '1', total: String(total) })}</span>
        <span className="rd-progress__bar" aria-hidden="true">
          <span style={{ width: `${(1 / total) * 100}%` }} />
        </span>
      </div>

      <div className="rd-step rd-step--done">
        <span className="rd-check rd-check--on" aria-hidden="true">
          <Check size={18} strokeWidth={2.5} />
        </span>
        <span className="rd-step__title">{done.title}</span>
        <span className="rd-stamp">
          <Check aria-hidden="true" size={14} strokeWidth={2.5} /> <span className="rd-code">{t('plan.stamp', { time: '14:02' })}</span>
        </span>
      </div>

      <article className="rd-step rd-step--current">
        <p className="rd-step__of">{t('plan.stepOf', { n: '2', total: String(total) })}</p>
        <div className="rd-step__row">
          <button type="button" className="rd-check" aria-label={t('plan.markDone')} />
          <h2 className="rd-step__title rd-step__title--big">{step.title}</h2>
        </div>
        <p className="rd-step__detail">{step.detail}</p>
        {step.do_not && (
          <div className="rd-avoid">
            <span className="rd-avoid__label">{t('plan.doNot')}</span>
            <p>{step.do_not}</p>
          </div>
        )}
        <p className="rd-why">
          <strong>{t('plan.why')}.</strong> {step.why}
        </p>
        <p className="rd-source">
          {t('plan.source')}: <a href={step.source_url}>{step.source_name}</a> <ExternalLink aria-hidden="true" size={14} />
        </p>
        <div className="rd-actions">
          <button type="button" className="rd-btn rd-btn--soft">
            {P[lang].ask}
          </button>
          <button type="button" className="rd-btn rd-btn--soft">
            <Phone aria-hidden="true" size={18} strokeWidth={1.75} /> {P[lang].contacts}
          </button>
        </div>
      </article>

      <div className="rd-actions rd-actions--nav">
        <button type="button" className="rd-btn rd-btn--quiet">
          {t('plan.prev')}
        </button>
        <button type="button" className="rd-btn rd-btn--primary">
          {t('plan.next')}
        </button>
      </div>
    </div>
  )
}

function Badge({ kind }: { kind: 'on-device' | 'cloud' | 'pack' | 'checklist' }) {
  const Icon = { 'on-device': Laptop, cloud: Cloud, pack: BookOpen, checklist: ListChecks }[kind]
  const label = { 'on-device': 'On-device AI', cloud: 'Cloud AI', pack: 'Offline Pack', checklist: 'Checklist' }[kind]
  return (
    <span className={`rd-badge rd-badge--${kind}`}>
      <Icon aria-hidden="true" size={15} strokeWidth={1.75} /> {label}
    </span>
  )
}

function ConfirmScreen() {
  const { t, lang } = useI18n()
  const p = P[lang]
  const rows: [string, ReactNode][] = [
    [t('triage.f.ransom_amount'), <input key="a" name="rd-amount" className="rd-input" defaultValue="500" inputMode="decimal" />],
    [t('triage.f.currency'), <input key="c" name="rd-currency" className="rd-input" defaultValue="EUR" />],
    [t('triage.f.group_name'), <input key="g" name="rd-group" className="rd-input" placeholder={p.group} />],
    [t('triage.f.contact_method'), <input key="m" name="rd-contact" className="rd-input" defaultValue={p.contact} />],
    [t('triage.f.deadline'), <input key="d" name="rd-deadline" className="rd-input" defaultValue={p.days} />],
    [t('triage.f.file_extension'), <input key="e" name="rd-ext" className="rd-input rd-code" defaultValue=".crypt7" />],
  ]
  return (
    <div className="rd-panel">
      <div className="rd-panel__head">
        <h2 className="rd-h2">{t('triage.title')}</h2>
        <Badge kind="on-device" />
        <span className="rd-meta">{t('triage.confidence', { level: t('triage.level.medium') })}</span>
      </div>
      <p className="rd-panel__intro">{t('triage.intro')}</p>
      <div className="rd-form">
        <label className="rd-field">
          <span className="rd-field__label">{t('triage.f.incident_type')}</span>
          <select name="rd-type" className="rd-input" defaultValue="ransomware">
            <option value="ransomware">{t('triage.type.ransomware')}</option>
            <option value="other">{t('triage.type.other')}</option>
          </select>
        </label>
        <div className="rd-field">
          <span className="rd-field__label">{t('triage.f.is_ransom_demand')}</span>
          <span className="rd-segs" role="group">
            <button type="button" aria-pressed="true">{t('triage.yes')}</button>
            <button type="button" aria-pressed="false">{t('triage.no')}</button>
          </span>
        </div>
        {rows.map(([label, input]) => (
          <label key={label} className="rd-field">
            <span className="rd-field__label">{label}</span>
            {input}
          </label>
        ))}
      </div>
      <div className="rd-avoid">
        <span className="rd-avoid__label">{t('plan.doNot')}</span>
        <p>{t('triage.avoid')}</p>
      </div>
      <div className="rd-actions">
        <button type="button" className="rd-btn rd-btn--primary">
          {t('triage.confirm')}
        </button>
        <button type="button" className="rd-btn rd-btn--quiet">
          {t('triage.discard')}
        </button>
      </div>
    </div>
  )
}

function PackScreen() {
  const { t, lang } = useI18n()
  const p = P[lang]
  return (
    <div className="rd-pack">
      <h2 className="rd-h2">{t('pack.searchTitle')}</h2>
      <form className="rd-search" onSubmit={(e) => e.preventDefault()}>
        <label className="rd-field rd-search__field">
          <span className="rd-field__label">{t('pack.searchLabel')}</span>
          <span className="rd-search__box">
            <Search aria-hidden="true" size={20} strokeWidth={1.75} />
            <input name="rd-q" className="rd-input" defaultValue={p.q} />
          </span>
        </label>
        <button type="submit" className="rd-btn rd-btn--primary">
          {t('pack.search')}
        </button>
      </form>
      <article className="rd-answer">
        <Badge kind="pack" />
        <h3 className="rd-answer__q">{p.hitQ}</h3>
        <p className="rd-answer__a">{p.hitA}</p>
        <p className="rd-source">
          {t('plan.source')}: <a href="https://www.cisa.gov/stopransomware/ransomware-guide">CISA #StopRansomware</a>{' '}
          <ExternalLink aria-hidden="true" size={14} />
        </p>
        <a className="rd-btn rd-btn--soft" href="tel:555-0142">
          <Phone aria-hidden="true" size={18} strokeWidth={1.75} /> {t('pack.call', { who: t('contacts.role.it_vendor'), phone: '555-0142' })}
        </a>
      </article>
      <p className="rd-meta rd-meta--row">
        <WifiOff aria-hidden="true" size={15} strokeWidth={1.75} /> {t('pack.offline')}
      </p>
    </div>
  )
}
