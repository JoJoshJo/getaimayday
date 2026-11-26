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
  const hexes = Object.values(tokens.color).flatMap((p) => Object.entries(p))
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
  it('radius never above 4px', () => {
    for (const v of Object.values(tokens.radius)) expect(parseFloat(v)).toBeLessThanOrEqual(4)
  })
  for (const [name, palette] of Object.entries(tokens.color))
    for (const p of CONTRAST_PAIRS)
      it(`${name}: ${p.fg} on ${p.bg} ≥ ${p.min}:1`, () => expect(contrast(palette[p.fg], palette[p.bg])).toBeGreaterThanOrEqual(p.min))
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
})
