/**
 * AIMayday design tokens — the ONLY place colors, fonts and sizes are defined.
 * Spec: .brain/DESIGN.md ("Editorial emergency manual").
 *
 * Pure data (no DOM) so build config (PWA manifest) and tests can import it.
 * src/ui/applyTokens.ts turns these into CSS custom properties:
 *   color.paper.textMuted → --color-text-muted, type.stepNum → --type-step-num, …
 */

/** Paper = light theme (default). */
const paper = {
  bg: '#fbf9f5',
  bg2: '#f3eee6',
  rule: '#ddd5c8',
  ruleStrong: '#171412',
  text: '#171412',
  textMuted: '#5b544d',
  accent: '#ff4829', // Mayday signal. Only: main action, current step, urgent do-not.
  accentText: '#c22a10', // same hue, darker: accent as SMALL text on paper (5.50:1)
  onAccent: '#171412',
  ok: '#2e6b3f',
  warn: '#8a5a0b',
  focus: '#171412',
}

/** Ink = dark theme. Same single accent. */
const ink: typeof paper = {
  bg: '#171412',
  bg2: '#221e1b',
  rule: '#3d3631',
  ruleStrong: '#fbf9f5',
  text: '#fbf9f5',
  textMuted: '#b3aaa0',
  accent: '#ff4829',
  accentText: '#ff4829', // 5.42:1 on ink, fine at any size
  onAccent: '#171412',
  ok: '#7cc08f',
  warn: '#d9a441',
  focus: '#fbf9f5',
}

export type ColorToken = keyof typeof paper

export const tokens = {
  color: { paper, ink },

  font: {
    display: '"Archivo Variable", sans-serif',
    body: '"Figtree Variable", sans-serif',
    mono: '"IBM Plex Mono", monospace',
    displayStretch: '112%',
  },

  weight: { light: '300', regular: '400', medium: '500', semibold: '600', heavy: '800', black: '900' },

  /** Font sizes. Body never below 1rem. */
  type: {
    stepNum: 'clamp(3.5rem, 9vw, 6rem)',
    displayXl: 'clamp(2.25rem, 5vw, 3.5rem)',
    displayMd: '1.375rem',
    title: '1.5rem',
    body: '1.125rem',
    small: '1rem',
    mono: '0.8125rem',
    monoSm: '0.75rem',
  },

  leading: { tight: '0.9', title: '1.25', body: '1.55', mono: '1.4' },

  tracking: { display: '-0.015em', mono: '0.12em' },

  /** 4px base. */
  space: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '24px', 6: '32px', 7: '48px', 8: '64px', 9: '96px' },

  /** Max 4px. No pills. */
  radius: { none: '0', sm: '2px', md: '4px' },

  border: { hair: '1px', strong: '2px', accent: '4px' },

  size: {
    tap: '44px',
    tapLg: '56px',
    checkbox: '28px',
    margin: '9rem', // left margin column (step numbers)
    content: '44rem',
    measure: '68ch',
    page: '72rem',
  },

  motion: {
    fast: '120ms',
    stamp: '250ms',
    ease: 'cubic-bezier(.2,.8,.2,1)',
    easeStamp: 'cubic-bezier(.3,1.4,.5,1)',
  },
} as const
