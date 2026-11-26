/** WCAG 2.x contrast ratio between two #rrggbb colors. */
export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Every text/background pair the UI uses, with the WCAG AA minimum.
 * Shown on /#/styleguide and asserted in tests/design.test.ts.
 */
export const CONTRAST_PAIRS = [
  { fg: 'text', bg: 'bg', min: 4.5 },
  { fg: 'text', bg: 'bg2', min: 4.5 },
  { fg: 'text', bg: 'surface', min: 4.5 },
  { fg: 'text', bg: 'avoidBg', min: 4.5 },
  { fg: 'textMuted', bg: 'bg', min: 4.5 },
  { fg: 'textMuted', bg: 'bg2', min: 4.5 },
  { fg: 'textMuted', bg: 'surface', min: 4.5 },
  { fg: 'accentText', bg: 'bg', min: 4.5 },
  { fg: 'accentText', bg: 'avoidBg', min: 4.5 },
  { fg: 'accent', bg: 'bg', min: 3 }, // UI marks only (the Avoid bar, the button fill)
  { fg: 'onAccent', bg: 'accent', min: 4.5 },
  { fg: 'onPrimary', bg: 'primary', min: 4.5 },
  { fg: 'ok', bg: 'bg', min: 4.5 },
  { fg: 'ok', bg: 'okBg', min: 4.5 },
  { fg: 'warn', bg: 'bg', min: 4.5 },
  { fg: 'warn', bg: 'warnBg', min: 4.5 },
  { fg: 'info', bg: 'infoBg', min: 4.5 },
  { fg: 'ruleStrong', bg: 'bg', min: 3 },
  { fg: 'focus', bg: 'bg', min: 3 },
] as const
