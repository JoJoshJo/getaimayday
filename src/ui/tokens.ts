/**
 * ALL design tokens live here. Placeholder, neutral values only — the final
 * design direction (MASTER.md §11) replaces this file, not the components.
 *
 * Tokens are written to CSS custom properties (--color-bg, --space-3, …) by
 * applyTokens(); components and styles.css reference only those variables.
 */

const light = {
  bg: '#ffffff',
  surface: '#f4f4f5',
  text: '#18181b',
  textMuted: '#52525b',
  border: '#d4d4d8',
  accent: '#1f2937',
  accentText: '#ffffff',
  warnBg: '#fef2f2',
  warnText: '#7f1d1d',
  warnBorder: '#fca5a5',
  done: '#166534',
  focus: '#2563eb',
}

const dark: typeof light = {
  bg: '#18181b',
  surface: '#27272a',
  text: '#f4f4f5',
  textMuted: '#a1a1aa',
  border: '#3f3f46',
  accent: '#e4e4e7',
  accentText: '#18181b',
  warnBg: '#3b1212',
  warnText: '#fecaca',
  warnBorder: '#7f1d1d',
  done: '#86efac',
  focus: '#60a5fa',
}

export const tokens = {
  color: { light, dark },
  font: {
    family: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    sizeSm: '0.9375rem',
    sizeBase: '1.125rem', // large by default: readable under stress
    sizeLg: '1.375rem',
    sizeXl: '1.75rem',
    lineHeight: '1.5',
    weightBold: '700',
  },
  space: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '24px', 6: '32px' },
  radius: { sm: '6px', md: '10px' },
  size: { tapTarget: '48px', checkbox: '28px', maxWidth: '720px' },
} as const

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())

function vars(prefix: string, obj: Record<string | number, string>): string {
  return Object.entries(obj)
    .map(([k, v]) => `--${prefix}-${kebab(String(k))}: ${v};`)
    .join('\n')
}

/** Injects tokens as CSS variables, with a dark-mode override. Call once at startup. */
export function applyTokens(): void {
  const t = tokens
  const base = [vars('font', t.font), vars('space', t.space), vars('radius', t.radius), vars('size', t.size)].join('\n')
  const css = `
:root { ${base}
${vars('color', t.color.light)}
color-scheme: light dark; }
@media (prefers-color-scheme: dark) { :root { ${vars('color', t.color.dark)} } }
`
  const el = document.createElement('style')
  el.id = 'design-tokens'
  el.textContent = css
  document.head.prepend(el)
}
