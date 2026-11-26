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

/**
 * Session 9 redesign PREVIEWS (styleguide only, not applied app-wide yet).
 * Three directions for J to pick from. Same color rules as above: hex only here,
 * contrast checked in tests/design.test.ts. Accent #ff4829 only for "Something's wrong"
 * and urgent "Avoid" items.
 */
type RdPalette = {
  bg: string; surface: string; surface2: string; line: string; text: string; muted: string
  accent: string; accentText: string; onAccent: string; primary: string; onPrimary: string
  ok: string; okBg: string; info: string; infoBg: string; avoidBg: string; hero: string; heroText: string; focus: string
}
type RdDirection = { name: string; radius: { sm: string; md: string; lg: string }; rond: string; light: RdPalette; dark: RdPalette }

/** Per-incident (and fix-it) calm tints: bg + icon ink. Used by direction C, icons in A/B. */
const rdTints = {
  light: {
    ransomware: { bg: '#fdece6', ink: '#a8331a' },
    bec: { bg: '#fcf1dc', ink: '#80520a' },
    phishing: { bg: '#e7f0fa', ink: '#2a5a92' },
    'lost-device': { bg: '#e7f2e8', ink: '#2b6b40' },
    outage: { bg: '#efede8', ink: '#5a534c' },
    fixit: { bg: '#eaf2f1', ink: '#2c6660' },
  },
  dark: {
    ransomware: { bg: '#3a221b', ink: '#ff9a82' },
    bec: { bg: '#352a16', ink: '#e6b765' },
    phishing: { bg: '#1b2a3c', ink: '#9cc3ef' },
    'lost-device': { bg: '#1d2e21', ink: '#8fd0a0' },
    outage: { bg: '#2b2825', ink: '#cfc6bb' },
    fixit: { bg: '#1a2e2c', ink: '#8fcfc6' },
  },
}

const rdDirections: Record<'a' | 'b' | 'c', RdDirection> = {
  a: {
    name: 'Calm helper',
    radius: { sm: '10px', md: '12px', lg: '16px' },
    rond: '60',
    light: { bg: '#f6f4ef', surface: '#ffffff', surface2: '#eeeae3', line: '#ddd7cd', text: '#22201d', muted: '#5f5a53', accent: '#ff4829', accentText: '#b52a10', onAccent: '#22201d', primary: '#22201d', onPrimary: '#ffffff', ok: '#2b6b40', okBg: '#e4f0e7', info: '#2f5d8a', infoBg: '#e8eff6', avoidBg: '#fdebe5', hero: '#ffffff', heroText: '#22201d', focus: '#22201d' },
    dark: { bg: '#171614', surface: '#211f1c', surface2: '#2b2825', line: '#3b3733', text: '#f4f1ec', muted: '#b8b0a6', accent: '#ff4829', accentText: '#ff7a60', onAccent: '#22201d', primary: '#f4f1ec', onPrimary: '#171614', ok: '#86c798', okBg: '#1e2e23', info: '#9cc0e6', infoBg: '#1d2733', avoidBg: '#3a211b', hero: '#211f1c', heroText: '#f4f1ec', focus: '#f4f1ec' },
  },
  b: {
    name: 'Google-ish, but ours',
    radius: { sm: '8px', md: '16px', lg: '16px' },
    rond: '0',
    light: { bg: '#ffffff', surface: '#f3f4f2', surface2: '#e8eae7', line: '#dcdedb', text: '#1b1c1e', muted: '#585c61', accent: '#ff4829', accentText: '#b52a10', onAccent: '#1b1c1e', primary: '#1b1c1e', onPrimary: '#ffffff', ok: '#17744a', okBg: '#dff1e7', info: '#2659c4', infoBg: '#e5edfb', avoidBg: '#fdebe5', hero: '#202124', heroText: '#ffffff', focus: '#1b1c1e' },
    dark: { bg: '#121315', surface: '#1c1d20', surface2: '#26282b', line: '#3a3c40', text: '#f1f2f3', muted: '#b1b5bb', accent: '#ff4829', accentText: '#ff7a60', onAccent: '#1b1c1e', primary: '#f1f2f3', onPrimary: '#121315', ok: '#6fd39b', okBg: '#17291f', info: '#8ab4f8', infoBg: '#1b2638', avoidBg: '#3a211b', hero: '#26282c', heroText: '#f1f2f3', focus: '#f1f2f3' },
  },
  c: {
    name: 'Warm and human',
    radius: { sm: '12px', md: '16px', lg: '16px' },
    rond: '100',
    light: { bg: '#ffffff', surface: '#faf8f5', surface2: '#f2eee8', line: '#e6e0d7', text: '#2a2420', muted: '#625952', accent: '#ff4829', accentText: '#b52a10', onAccent: '#2a2420', primary: '#2a2420', onPrimary: '#ffffff', ok: '#2b6b40', okBg: '#e4f0e7', info: '#2f5d8a', infoBg: '#e8eff6', avoidBg: '#fdebe5', hero: '#fff4ee', heroText: '#2a2420', focus: '#2a2420' },
    dark: { bg: '#191614', surface: '#221e1b', surface2: '#2c2723', line: '#3e3732', text: '#f6f1eb', muted: '#bcb2a7', accent: '#ff4829', accentText: '#ff7a60', onAccent: '#2a2420', primary: '#f6f1eb', onPrimary: '#191614', ok: '#86c798', okBg: '#1e2e23', info: '#9cc0e6', infoBg: '#1d2733', avoidBg: '#3a211b', hero: '#2a201b', heroText: '#f6f1eb', focus: '#f6f1eb' },
  },
}

export const redesign = {
  font: { sans: '"Google Sans Flex Variable", sans-serif', code: '"Google Sans Code Variable", monospace' },
  directions: rdDirections,
  tints: rdTints,
} as const
export type RdPaletteToken = keyof RdPalette
