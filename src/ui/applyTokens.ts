import { tokens } from './tokens'

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())

function vars(prefix: string, obj: Record<string | number, string>): string {
  return Object.entries(obj)
    .map(([k, v]) => `--${prefix}-${kebab(String(k))}: ${v};`)
    .join(' ')
}

/** Builds the token stylesheet. Exported for tests. */
export function tokensCss(): string {
  const t = tokens
  const base = [
    vars('font', t.font),
    vars('weight', t.weight),
    vars('type', t.type),
    vars('leading', t.leading),
    vars('tracking', t.tracking),
    vars('space', t.space),
    vars('radius', t.radius),
    vars('border', t.border),
    vars('size', t.size),
    vars('motion', t.motion),
  ].join('\n')
  const paper = vars('color', t.color.paper)
  const ink = vars('color', t.color.ink)

  // Theme: follows the OS; data-theme="light|dark" on any element forces it for that subtree.
  return `
:root { ${base} }
:root, [data-theme="light"] { ${paper} color-scheme: light; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${ink} color-scheme: dark; } }
[data-theme="dark"] { ${ink} color-scheme: dark; }
[data-theme="light"] { ${paper} color-scheme: light; }
@media (prefers-reduced-motion: reduce) { :root { --motion-fast: 0ms; --motion-stamp: 0ms; } }
`
}

/** Injects tokens as CSS custom properties. Call once at startup. */
export function applyTokens(): void {
  const el = document.createElement('style')
  el.id = 'design-tokens'
  el.textContent = tokensCss()
  document.head.prepend(el)
}
