/**
 * AIMayday design tokens — the ONLY place colors, fonts and sizes are defined.
 * Spec: .brain/DESIGN.md (v2, Session 9: "Warm and human").
 *
 * Pure data (no DOM) so build config (PWA manifest) and tests can import it.
 * src/ui/applyTokens.ts turns these into CSS custom properties:
 *   color.paper.textMuted → --color-text-muted, type.title → --type-title,
 *   tint.paper.ransomware → --tint-ransomware / --tint-ransomware-ink, …
 */

/** Paper = light theme (default). White page, warm neutrals. */
const paper = {
  bg: '#ffffff',
  bg2: '#f2eee8', // soft panels, hero, quiet buttons
  surface: '#faf8f5', // cards on the page
  rule: '#e6e0d7',
  ruleStrong: '#2a2420', // checkbox ring, focus-level borders
  text: '#2a2420',
  textMuted: '#625952',
  accent: '#ff4829', // Mayday signal. Only: "Something's wrong" + urgent "Avoid".
  accentText: '#b52a10', // same hue, darker: accent as small text
  onAccent: '#2a2420',
  avoidBg: '#fdebe5', // "Avoid" box and the clean-device warning
  primary: '#2a2420', // main button on every other screen (Next step, Confirm, Search)
  onPrimary: '#ffffff',
  ok: '#2b6b40',
  okBg: '#e4f0e7',
  warn: '#80520a',
  warnBg: '#fcf1dc',
  info: '#2f5d8a', // source badges
  infoBg: '#e8eff6',
  focus: '#2a2420',
}

/** Ink = dark theme. Same single accent. */
const ink: typeof paper = {
  bg: '#191614',
  bg2: '#2c2723',
  surface: '#221e1b',
  rule: '#3e3732',
  ruleStrong: '#f6f1eb',
  text: '#f6f1eb',
  textMuted: '#bcb2a7',
  accent: '#ff4829',
  accentText: '#ff7a60',
  onAccent: '#2a2420',
  avoidBg: '#3a211b',
  primary: '#f6f1eb',
  onPrimary: '#191614',
  ok: '#86c798',
  okBg: '#1e2e23',
  warn: '#e6b765',
  warnBg: '#352a16',
  info: '#9cc0e6',
  infoBg: '#1d2733',
  focus: '#f6f1eb',
}

export type ColorToken = keyof typeof paper

/** One calm colour per incident (and one for IT fix-its): tile + plan background, icon ink. */
const tintPaper = {
  ransomware: { bg: '#fdece6', ink: '#a8331a' },
  bec: { bg: '#fcf1dc', ink: '#80520a' },
  phishing: { bg: '#e7f0fa', ink: '#2a5a92' },
  'lost-device': { bg: '#e7f2e8', ink: '#2b6b40' },
  outage: { bg: '#efede8', ink: '#5a534c' },
  fixit: { bg: '#eaf2f1', ink: '#2c6660' },
}
const tintInk: typeof tintPaper = {
  ransomware: { bg: '#3a221b', ink: '#ff9a82' },
  bec: { bg: '#352a16', ink: '#e6b765' },
  phishing: { bg: '#1b2a3c', ink: '#9cc3ef' },
  'lost-device': { bg: '#1d2e21', ink: '#8fd0a0' },
  outage: { bg: '#2b2825', ink: '#cfc6bb' },
  fixit: { bg: '#1a2e2c', ink: '#8fcfc6' },
}
export type Tone = keyof typeof tintPaper

export const tokens = {
  color: { paper, ink },
  tint: { paper: tintPaper, ink: tintInk },

  font: {
    display: '"Google Sans Flex Variable", sans-serif',
    body: '"Google Sans Flex Variable", sans-serif',
    mono: '"Google Sans Code Variable", monospace', // times, file extensions, technical details only
    rond: '100', // Google Sans Flex roundness axis (0–100): fully round = friendlier
  },

  weight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700', heavy: '800' },

  /** Font sizes. Body never below 1rem. */
  type: {
    displayXl: 'clamp(2.25rem, 5.5vw, 3rem)',
    displayMd: '1.25rem',
    h2: '1.375rem',
    title: '1.375rem',
    body: '1.125rem',
    small: '1rem',
    label: '0.9375rem',
    code: '0.9375rem',
  },

  leading: { tight: '1.1', title: '1.3', body: '1.55' },

  tracking: { display: '-0.01em' },

  /** 4px base. */
  space: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '24px', 6: '32px', 7: '48px', 8: '64px', 9: '96px' },

  /** Soft corners, max 16px (DESIGN.md §4). */
  radius: { none: '0', sm: '12px', md: '16px' },

  border: { hair: '1px', mid: '1.5px', strong: '2px', accent: '4px' },

  size: {
    tap: '44px',
    btn: '48px',
    tapLg: '56px',
    checkbox: '32px',
    icon: '24px',
    iconLg: '36px',
    content: '44rem',
    measure: '66ch',
    page: '72rem',
  },

  motion: {
    fast: '120ms',
    stamp: '200ms',
    ease: 'cubic-bezier(.2,.8,.2,1)',
  },
} as const

