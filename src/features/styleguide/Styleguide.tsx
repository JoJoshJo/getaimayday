import { useState, type ReactNode } from 'react'
import { useI18n } from '../../i18n'
import { getPlan } from '../../plans'
import { DoNot, LangToggle, Progress, Stamp, StatusChip, Wordmark } from '../../ui/components'
import { CONTRAST_PAIRS, contrast } from '../../ui/contrast'
import { tokens, type ColorToken } from '../../ui/tokens'
import { StepRow } from '../incident/StepRow'

const SAMPLE_TIME = new Date(2026, 10, 24, 14, 2) // fixed sample for the stamp

/** Design review page at /#/styleguide: every token and component, Paper and Ink side by side. */
export default function Styleguide() {
  const [stampKey, setStampKey] = useState(0)
  return (
    <div className="sg">
      <header className="sg__head page">
        <p className="kicker mono">AIMayday · design system v1</p>
        <h1 className="plan__title">Styleguide</h1>
        <p className="sg__lede">
          Every token and component in Paper (light) and Ink (dark). Source: <code>src/ui/tokens.ts</code>, spec:{' '}
          <code>.brain/DESIGN.md</code>. <a href="#/">Back to the app</a>.
        </p>
        <button type="button" className="btn" onClick={() => setStampKey((k) => k + 1)}>
          Replay stamp
        </button>
      </header>
      <div className="sg__panels">
        <Panel theme="light" name="Paper" stampKey={stampKey} />
        <Panel theme="dark" name="Ink" stampKey={stampKey} />
      </div>
    </div>
  )
}

function Panel({ theme, name, stampKey }: { theme: 'light' | 'dark'; name: string; stampKey: number }) {
  const { lang, t } = useI18n()
  const palette = theme === 'light' ? tokens.color.paper : tokens.color.ink
  const plan = getPlan(lang, 'ransomware')!
  const [s1, s2, s3] = [plan.steps[1], plan.steps[0], plan.steps[3]]
  const logged = SAMPLE_TIME

  return (
    <section data-theme={theme} className="sg__panel" aria-label={`${name} theme`}>
      <h2 className="sg__panel-title display">{name}</h2>

      <Block title="Color">
        <div className="sg__swatches">
          {(Object.keys(palette) as ColorToken[]).map((k) => (
            <div key={k} className="sg__swatch">
              <span className="sg__chip" style={{ background: `var(--color-${kebab(k)})` }} />
              <span className="mono">{k}</span>
              <span className="mono sg__muted">{palette[k]}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Contrast (WCAG AA)">
        <table className="sg__table">
          <thead>
            <tr className="mono">
              <th>Text</th>
              <th>On</th>
              <th>Ratio</th>
              <th>Min</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {CONTRAST_PAIRS.map((p) => {
              const r = contrast(palette[p.fg], palette[p.bg])
              return (
                <tr key={p.fg + p.bg}>
                  <td className="mono">{p.fg}</td>
                  <td className="mono">{p.bg}</td>
                  <td className="mono">{r.toFixed(2)}</td>
                  <td className="mono">{p.min}</td>
                  <td className="mono">{r >= p.min ? 'Pass' : 'FAIL'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Block>

      <Block title="Type">
        <div className="sg__type">
          <span className="step__num sg__num">07</span>
          <span className="plan__title">Ransomware</span>
          <span className="wordmark">AIMayday</span>
          <span className="step__title">Disconnect the infected computer</span>
          <span>Body. Unplug its network cable and turn off its Wi-Fi. Leave the computer switched on.</span>
          <span className="sg__small">Small. The attackers may be watching the infected computer.</span>
          <span className="mono">Mono label · Source · 14:02</span>
        </div>
      </Block>

      <Block title="Space · radius · border">
        <div className="sg__space">
          {Object.entries(tokens.space).map(([k, v]) => (
            <div key={k} className="sg__space-row">
              <span className="mono sg__muted">space-{k}</span>
              <span className="sg__bar" style={{ width: v }} />
              <span className="mono sg__muted">{v}</span>
            </div>
          ))}
        </div>
        <div className="sg__radii">
          {Object.entries(tokens.radius).map(([k, v]) => (
            <div key={k} className="sg__radius" style={{ borderRadius: v }}>
              <span className="mono">
                {k} {v}
              </span>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Top bar parts">
        <div className="sg__row">
          <Wordmark />
          <StatusChip state="offlineReady" />
          <StatusChip state="preparing" />
          <StatusChip state="offline" />
          <LangToggle />
        </div>
      </Block>

      <Block title="Buttons">
        <div className="sg__row">
          <button type="button" className="btn-mayday">
            {t('action.somethingWrong')}
          </button>
        </div>
        <div className="sg__row">
          <button type="button" className="btn">
            ← {t('plan.prev')}
          </button>
          <button type="button" className="btn btn--strong">
            {t('plan.next')} →
          </button>
          <button type="button" className="btn btn--quiet">
            {t('plan.viewAll')}
          </button>
          <button type="button" className="btn" disabled>
            Disabled
          </button>
        </div>
      </Block>

      <Block title="Progress">
        <Progress states={['done', 'done', 'done', 'current', 'todo', 'todo', 'todo', 'todo']} label={t('plan.progress', { done: '03', total: '08' })} />
      </Block>

      <Block title="Do-not box · stamp">
        <DoNot>{s1.do_not ?? ''}</DoNot>
        <div className="sg__row">
          <Stamp key={stampKey} at={logged} />
        </div>
      </Block>

      <Block title="Steps: done · current · todo">
        <div className="plan">
          <div className="steps">
            <StepRow step={s2} index={0} total={15} state="done" doneAt={logged} onToggle={() => {}} key={`d${stampKey}`} />
            <StepRow step={s1} index={1} total={15} state="current" onToggle={() => {}} />
            <StepRow step={s3} index={3} total={15} state="todo" onToggle={() => {}} />
          </div>
        </div>
      </Block>
    </section>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="sg__block">
      <h3 className="mono sg__block-title">{title}</h3>
      {children}
    </div>
  )
}

// Same rule as applyTokens.ts: camelCase → kebab-case (bg2 stays bg2).
const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
