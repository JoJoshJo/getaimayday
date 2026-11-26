/** Security headers in firebase.json (Session 5). Every allowed origin is documented in SESSION_HANDOFF.md. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const fb = JSON.parse(readFileSync(join(__dirname, '..', 'firebase.json'), 'utf8'))
const all = fb.hosting.headers.find((h: { source: string }) => h.source === '**').headers as { key: string; value: string }[]
const get = (k: string) => all.find((h) => h.key === k)?.value ?? ''
const csp = Object.fromEntries(
  get('Content-Security-Policy')
    .split(';')
    .map((d) => d.trim().split(/\s+/))
    .map(([name, ...v]) => [name, v]),
) as Record<string, string[]>

describe('Content-Security-Policy', () => {
  it('no inline scripts or styles, no eval', () => {
    for (const v of Object.values(csp)) for (const bad of ["'unsafe-inline'", "'unsafe-eval'", '*', 'http:', 'https:']) expect(v).not.toContain(bad)
  })
  it('locks down the basics', () => {
    expect(csp['default-src']).toEqual(["'self'"])
    expect(csp['object-src']).toEqual(["'none'"])
    expect(csp['frame-ancestors']).toEqual(["'none'"])
    expect(csp['style-src']).toEqual(["'self'"])
    expect(csp['font-src']).toEqual(["'self'"])
  })
  it('allows exactly the documented origins', () => {
    expect(csp['script-src']).toEqual(["'self'", 'https://www.google.com/recaptcha/', 'https://www.gstatic.com/recaptcha/'])
    expect(csp['frame-src']).toEqual(['https://www.google.com/recaptcha/', 'https://recaptcha.google.com/recaptcha/'])
    expect(csp['connect-src']).toEqual([
      "'self'",
      'data:',
      'https://firebasevertexai.googleapis.com',
      'https://content-firebaseappcheck.googleapis.com',
      'https://firebaseinstallations.googleapis.com',
      'https://firebaseremoteconfig.googleapis.com',
      'https://www.google.com/recaptcha/',
    ])
    expect(csp['img-src']).toEqual(["'self'", 'blob:'])
  })
})

describe('other headers', () => {
  it('nosniff, referrer, permissions, framing', () => {
    expect(get('X-Content-Type-Options')).toBe('nosniff')
    expect(get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(get('Permissions-Policy')).toMatch(/camera=\(\)/)
    expect(get('X-Frame-Options')).toBe('DENY')
  })
  it('service worker is never cached', () => {
    const sw = fb.hosting.headers.find((h: { source: string }) => h.source === '/sw.js')
    expect(sw.headers.find((h: { key: string }) => h.key === 'Cache-Control').value).toMatch(/no-cache/)
  })
})
