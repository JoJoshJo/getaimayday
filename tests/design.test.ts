/**
 * Design-system guard rails (.brain/DESIGN.md §8). Fails the build on AI-slop tells
 * and on any color defined outside src/ui/tokens.ts.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LANGUAGES, messages } from '../src/i18n/messages'
import { rawPlans } from '../src/plans'
import { rawFixits } from '../src/fixits'
import { CONTRAST_PAIRS, contrast } from '../src/ui/contrast'
import { tokens } from '../src/ui/tokens'

const SRC = join(__dirname, '..', 'src')
const TOKENS_FILE = 'ui/tokens.ts'

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}
const code = walk(SRC)
  .filter((p) => /\.(ts|tsx|css)$/.test(p))
  .map((p) => ({ file: relative(SRC, p), text: readFileSync(p, 'utf8') }))

/** Returns "file:line  match" for every hit. */
function scan(re: RegExp, files = code) {
  const hits: string[] = []
  for (const { file, text } of files)
    text.split('\n').forEach((line, i) => {
      const m = line.match(re)
      if (m) hits.push(`${file}:${i + 1}  ${m[0]}`)
    })
  return hits
}

const notTokens = code.filter((f) => f.file !== TOKENS_FILE)

describe('colors live only in tokens.ts', () => {
  it('no hex colors elsewhere', () => expect(scan(/#[0-9a-fA-F]{3,8}(?![\w-])/, notTokens)).toEqual([]))
  it('no rgb()/hsl()/oklch() elsewhere', () => expect(scan(/\b(rgba?|hsla?|oklch|oklab|lab|lch)\(/, notTokens)).toEqual([]))
  it('no named CSS colors in styles', () =>
    expect(scan(/:\s*(white|black|red|orange|purple|violet|indigo|blue|green|gray|grey)\b/, notTokens.filter((f) => f.file.endsWith('.css')))).toEqual([]))
})

describe('banned visual effects', () => {
  it('no gradients', () => expect(scan(/gradient\(/i)).toEqual([]))
  it('no blur / glassmorphism', () => expect(scan(/backdrop-filter|blur\(/i)).toEqual([]))
  it('no shadows or glows', () => expect(scan(/(box|text)-shadow|drop-shadow/i)).toEqual([]))
  it('no banned fonts', () => expect(scan(/\b(Inter|Roboto|Poppins|Space Grotesk|system-ui|-apple-system|Segoe UI)\b/)).toEqual([]))
})

describe('tokens', () => {
  const tintHexes = Object.values(tokens.tint).flatMap((t) => Object.entries(t).flatMap(([k, v]) => [[`${k}.bg`, v.bg], [`${k}.ink`, v.ink]] as [string, string][]))
  const hexes = [...Object.values(tokens.color).flatMap((p) => Object.entries(p)), ...tintHexes]
  const hue = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
    if (d === 0) return { h: 0, s: 0 }
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    const l = (max + min) / 2
    return { h: (h * 60 + 360) % 360, s: d / (1 - Math.abs(2 * l - 1)) }
  }
  it('no purple / violet / indigo', () => {
    const bad = hexes.filter(([, v]) => {
      const { h, s } = hue(v)
      return s > 0.15 && h >= 230 && h <= 320
    })
    expect(bad).toEqual([])
  })
  // Session 10: red and orange mean danger ("Something's wrong", "Avoid"), so no tint may use them.
  it('no red or orange incident tint (hue 330–45° with colour)', () => {
    const bad = tintHexes.filter(([, v]) => {
      const { h, s } = hue(v)
      return s > 0.2 && (h >= 330 || h <= 45)
    })
    expect(bad).toEqual([])
  })
  // Session 9: soft corners allowed, up to 16px (was 4px in design v1).
  it('radius never above 16px', () => {
    for (const v of Object.values(tokens.radius)) expect(parseFloat(v)).toBeLessThanOrEqual(16)
  })
  for (const [name, palette] of Object.entries(tokens.color))
    for (const p of CONTRAST_PAIRS)
      it(`${name}: ${p.fg} on ${p.bg} ≥ ${p.min}:1`, () => expect(contrast(palette[p.fg], palette[p.bg])).toBeGreaterThanOrEqual(p.min))
})

describe('incident tints (Session 9): text, muted text and icon ink ≥ 4.5:1 on every tint', () => {
  for (const theme of ['paper', 'ink'] as const)
    for (const [k, tint] of Object.entries(tokens.tint[theme]))
      it(`${theme}: ${k}`, () => {
        const c = tokens.color[theme]
        for (const fg of [c.text, c.textMuted, tint.ink]) expect(contrast(fg, tint.bg)).toBeGreaterThanOrEqual(4.5)
      })
})

describe('copy', () => {
  const BUZZ = /\b(seamless(ly)?|unlock|supercharge|revolutioni[sz]e|empower|effortless(ly)?|game-?changer|next-gen|cutting-edge|leverage|synergy)\b/i
  const strings = [
    ...LANGUAGES.flatMap((l) => Object.entries(messages[l]).map(([k, v]) => [`i18n/${l}:${k}`, v])),
    ...Object.entries(rawPlans).flatMap(([l, byId]) => Object.entries(byId).map(([id, p]) => [`plans/${l}/${id}`, JSON.stringify(p)])),
    ...Object.entries(rawFixits).flatMap(([l, byId]) => Object.entries(byId).map(([id, p]) => [`fixits/${l}/${id}`, JSON.stringify(p)])),
  ]
  // UI strings only: plan content may use these words literally ("unlock files").
  it('no buzzwords in UI copy', () =>
    expect(strings.filter(([k, v]) => k.startsWith('i18n/') && BUZZ.test(v)).map(([k]) => k)).toEqual([]))
  it('no em dashes', () => expect(strings.filter(([, v]) => v.includes('—')).map(([k]) => k)).toEqual([]))
  it('no emoji', () => expect(strings.filter(([, v]) => /\p{Extended_Pictographic}/u.test(v)).map(([k]) => k)).toEqual([]))
  it('no exclamation marks', () => expect(strings.filter(([, v]) => v.includes('!')).map(([k]) => k)).toEqual([]))
  // Session 9: arrows as text pull the font's math/symbols subset, which is not precached (offline error).
  it('no arrow characters in copy (use lucide icons)', () =>
    expect(strings.filter(([, v]) => /[←→↗↑↓]/.test(v)).map(([k]) => k)).toEqual([]))
  it('no arrow characters in JSX text (use lucide icons)', () =>
    expect(scan(/>[^<>{}]*[←→↗↑↓][^<>{}]*</, code.filter((f) => f.file.endsWith('.tsx')))).toEqual([]))
})

// ---- Session 11 ----
const css = readFileSync(join(SRC, 'ui', 'styles.css'), 'utf8')
/** The declarations of one CSS rule, by its exact selector (first match). */
function rule(selector: string): string {
  const i = css.indexOf(`\n${selector} {`)
  if (i < 0) throw new Error(`no rule ${selector}`)
  return css.slice(i, css.indexOf('}', i))
}
/** CIE76 ΔE between two hex colours (same formula as Session 10's measurements). */
function deltaE(a: string, b: string): number {
  const lab = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
    const x = f((0.4124 * r + 0.3576 * g + 0.1805 * bl) / 0.95047), y = f(0.2126 * r + 0.7152 * g + 0.0722 * bl), z = f((0.0193 * r + 0.1192 * g + 0.9505 * bl) / 1.08883)
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
  }
  const [p, q] = [lab(a), lab(b)]
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])
}

describe('Session 11: the ransomware plan page wears the navy tint, apart from "Avoid", in both themes', () => {
  it('the plan panel and its icon take the incident tint through data-tone', () => {
    expect(css).toMatch(/\[data-tone='ransomware'\] \{ --tone: var\(--tint-ransomware\); --tone-ink: var\(--tint-ransomware-ink\); \}/)
    expect(rule('.plan')).toMatch(/background: var\(--tone/)
    expect(rule('.plan__icon')).toMatch(/color: var\(--tone-ink/)
    const view = readFileSync(join(SRC, 'features', 'incident', 'IncidentView.tsx'), 'utf8')
    expect(view).toMatch(/tone=\{plan\.incident\}/)
  })
  for (const theme of ['paper', 'ink'] as const)
    it(`${theme}: ransomware panel vs "Avoid" background ΔE ≥ 9.7, icon ink vs accent ΔE ≥ 30`, () => {
      const c = tokens.color[theme], r = tokens.tint[theme].ransomware
      expect(deltaE(r.bg, c.avoidBg)).toBeGreaterThanOrEqual(9.7)
      expect(deltaE(r.ink, c.accent)).toBeGreaterThanOrEqual(30)
    })
})

describe('Session 11: the open incident card uses its own incident tint', () => {
  it('each open incident row sets data-tone from its incident and shows its icon', () => {
    const src = readFileSync(join(SRC, 'features', 'log', 'OpenIncidents.tsx'), 'utf8')
    expect(src).toMatch(/data-tone=\{r\.incident\}/)
    expect(src).toMatch(/INCIDENT_ICON\[r\.incident\]/)
  })
  it('the card is filled with the tone, never the warn colour', () => {
    expect(rule('.openinc__link')).toMatch(/background: var\(--tone/)
    expect(rule('.openinc__icon')).toMatch(/color: var\(--tone-ink/)
    expect(rule('.openinc')).not.toMatch(/warn/)
  })
})

describe('Session 11: progress reads "0 of 16 done", the current step is never filled', () => {
  it('no zero padding, plain "of" / "sur"', () => {
    expect(messages.en['plan.progress']).toBe('{done} of {total} done')
    expect(messages.fr['plan.progress']).toBe('{done} sur {total} faites')
    expect(readFileSync(join(SRC, 'features', 'incident', 'PlanView.tsx'), 'utf8')).not.toMatch(/padStart/)
  })
  it('current segment: outline in text colour on the empty background', () => {
    const cur = rule('.progress__seg--current')
    expect(cur).toMatch(/background: var\(--color-bg\)/)
    expect(cur).toMatch(/outline: .* var\(--color-text\)/)
  })
  it('buttons never underline on hover (text links do)', () => {
    expect(rule('.btn--strong:hover:not(:disabled)')).not.toMatch(/underline/)
    expect(rule('.btn:hover:not(:disabled)')).not.toMatch(/underline/)
  })
})
