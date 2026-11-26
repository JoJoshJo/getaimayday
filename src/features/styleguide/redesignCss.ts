/** Session 9 redesign previews: tokens.ts (redesign) → --rd-* custom properties, scoped to .rd[data-dir][data-theme]. */
import { redesign, type RdPaletteToken } from '../../ui/tokens'

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())

export function redesignCss(): string {
  const out: string[] = [`.rd { --rd-sans: ${redesign.font.sans}; --rd-code: ${redesign.font.code}; }`]
  for (const [dir, d] of Object.entries(redesign.directions)) {
    out.push(`.rd[data-dir="${dir}"] { --rd-r-sm: ${d.radius.sm}; --rd-r-md: ${d.radius.md}; --rd-r-lg: ${d.radius.lg}; --rd-rond: ${d.rond}; }`)
    for (const theme of ['light', 'dark'] as const) {
      const pal = d[theme]
      const vars = (Object.keys(pal) as RdPaletteToken[]).map((k) => `--rd-${kebab(k)}: ${pal[k]};`).join(' ')
      out.push(`.rd[data-dir="${dir}"][data-theme="${theme}"] { ${vars} }`)
    }
  }
  for (const theme of ['light', 'dark'] as const) {
    const vars = Object.entries(redesign.tints[theme])
      .map(([k, v]) => `--rd-tint-${k}: ${v.bg}; --rd-tint-${k}-ink: ${v.ink};`)
      .join(' ')
    out.push(`.rd[data-theme="${theme}"] { ${vars} }`)
  }
  return out.join('\n')
}

