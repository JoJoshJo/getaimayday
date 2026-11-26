/** Session 12: "New version ready" banner + lab samples shipped. Static checks (vitest has no DOM). */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { messages } from '../src/i18n/messages'
import { pwaOptions } from '../src/sw/pwa.config'

const root = join(__dirname, '..')
const read = (p: string) => readFileSync(join(root, p), 'utf8')

describe('new version banner', () => {
  it('the service worker waits for the person (prompt), registered by useRegisterSW, not an injected script', () => {
    expect(pwaOptions.registerType).toBe('prompt')
    expect(pwaOptions.injectRegister).toBe(false)
    expect(read('src/ui/useSwUpdate.ts')).toMatch(/from 'virtual:pwa-register\/react'/)
  })
  it('never reloads on its own: updateServiceWorker only in the click handler', () => {
    const hook = read('src/ui/useSwUpdate.ts')
    expect(hook).toMatch(/reload: \(\) => void updateServiceWorker\(true\)/)
    expect(hook.match(/updateServiceWorker\(/g)?.length).toBe(1)
    expect(read('src/ui/UpdateBanner.tsx')).toMatch(/onClick=\{onReload\}/)
    expect(read('src/App.tsx').match(/useSwUpdate\(\)/g)?.length).toBe(1)
  })
  it('polite live region, calm info colours, not the danger accent', () => {
    const banner = read('src/ui/UpdateBanner.tsx')
    expect(banner).toMatch(/role="status" aria-live="polite"/)
    const css = read('src/ui/styles.css')
    const rule = css.slice(css.indexOf('.update__inner {'), css.indexOf('}', css.indexOf('.update__inner {')))
    expect(rule).toMatch(/background: var\(--color-info-bg\)/)
    expect(rule).toMatch(/color: var\(--color-info\)/)
    expect(rule).not.toMatch(/accent|avoid/)
  })
  it('EN + FR copy', () => {
    expect([messages.en['update.ready'], messages.en['update.reload']]).toEqual(['New version ready', 'Reload'])
    expect([messages.fr['update.ready'], messages.fr['update.reload']]).toEqual(['Nouvelle version prête', 'Recharger'])
  })
})

describe('lab samples ship to Firebase Hosting, not the offline cache', () => {
  it('firebase.json does not ignore lab/', () => {
    const ignore: string[] = JSON.parse(read('firebase.json')).hosting.ignore
    expect(ignore.filter((g) => /(^|\/)lab(\/|$)/.test(g))).toEqual([])
  })
  it('the service worker skips them, and the build checks them', () => {
    expect(pwaOptions.workbox?.globIgnores).toContain('**/lab/**')
    expect(JSON.parse(read('package.json')).scripts.build).toMatch(/check-lab-samples\.mjs/)
  })
})
