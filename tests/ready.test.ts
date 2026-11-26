/** Get ready checklist: pure readiness + every message key the screen can build exists. */
import { describe, expect, it } from 'vitest'
import { readiness, type ReadyInput } from '../src/features/ready/readiness'
import { messages } from '../src/i18n/messages'

const base: ReadyInput = { appCached: true, profileFilled: true, contactRoles: ['it_vendor', 'bank_fraud', 'insurer'], pack: { updated_at: 1, stale: false }, printedAt: 2, onDevice: 'unavailable', warmed: false }

describe('readiness', () => {
  it('all required done → 5/5; no on-device AI is only a bonus', () => {
    const r = readiness(base)
    expect([r.done, r.total]).toEqual([5, 5])
    expect(r.items.find((i) => i.key === 'ondevice')).toMatchObject({ state: 'bonus', detail: 'none' })
  })
  it('nothing done on a fresh device', () => {
    const r = readiness({ appCached: false, profileFilled: false, contactRoles: [], pack: null, printedAt: null, onDevice: 'no-prompt-api', warmed: false })
    expect(r.done).toBe(0)
  })
  it('IT contact only → contacts "warn" (not done); no IT contact → "todo"', () => {
    expect(readiness({ ...base, contactRoles: ['it_vendor'] }).items.find((i) => i.key === 'contacts')!.state).toBe('warn')
    expect(readiness({ ...base, contactRoles: ['insurer'] }).items.find((i) => i.key === 'contacts')!.state).toBe('todo')
  })
  it('stale Pack is "warn" and not counted', () => {
    const r = readiness({ ...base, pack: { updated_at: 1, stale: true } })
    expect(r.items.find((i) => i.key === 'pack')!.state).toBe('warn')
    expect(r.done).toBe(4)
  })
  it.each([
    ['available', false, 'available'],
    ['available', true, 'warm'],
    ['downloadable', false, 'downloadable'],
    ['downloading', false, 'downloadable'],
    ['unavailable', false, 'none'],
  ])('on-device %s (warmed %s) → %s', (onDevice, warmed, detail) => {
    expect(readiness({ ...base, onDevice, warmed }).items.find((i) => i.key === 'ondevice')!.detail).toBe(detail)
  })
})

describe('every Get ready message the screen can build exists in EN and FR', () => {
  const keys = [
    ...['app', 'profile', 'printed'].flatMap((k) => ['ok', 'todo'].map((s) => `ready.${k}.${s}`)),
    ...['ok', 'warn', 'todo'].flatMap((s) => [`ready.pack.${s}`, `ready.contacts.${s}`]),
    ...['warm', 'available', 'downloadable', 'none'].map((d) => `ready.ondevice.${d}`),
    ...['profile', 'contacts', 'pack', 'printed'].map((k) => `ready.go.${k}`),
    ...['app', 'profile', 'contacts', 'pack', 'printed', 'ondevice'].map((k) => `ready.name.${k}`),
    ...['ok', 'todo', 'warn', 'bonus'].map((s) => `ready.state.${s}`),
  ]
  it.each(['en', 'fr'] as const)('%s', (lang) => {
    const m = messages[lang] as Record<string, string>
    expect(keys.filter((k) => !m[k])).toEqual([])
  })
})
