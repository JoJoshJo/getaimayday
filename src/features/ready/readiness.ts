/**
 * Get ready (MASTER §6 MUST #11): what must be true on a calm day so incident
 * day works offline. Pure: inputs in, checklist out (tested).
 *
 * Required (counted in the top-bar chip): app saved for offline, business
 * details, IT contact, Offline Pack built and up to date, plans printed.
 * On-device AI is a bonus: most office PCs can't run it, and the Pack covers it.
 */
export type ReadyKey = 'app' | 'profile' | 'contacts' | 'pack' | 'printed' | 'ondevice'
export type ReadyState = 'ok' | 'todo' | 'warn' | 'bonus'
export type ReadyItem = { key: ReadyKey; state: ReadyState; detail?: string }

export type ReadyInput = {
  /** Service worker controls the page (or we are already offline running from cache). */
  appCached: boolean
  profileFilled: boolean
  /** Roles with at least a name, phone or email. */
  contactRoles: string[]
  pack: { updated_at: number; stale: boolean } | null
  printedAt: number | null
  /** Prompt API availability string ('available', 'downloadable', 'unavailable', 'no-prompt-api', ...). */
  onDevice: string
  warmed: boolean
}

export const KEY_ROLES = ['it_vendor', 'bank_fraud', 'insurer'] as const

export function readiness(i: ReadyInput): { items: ReadyItem[]; done: number; total: number } {
  const keyRolesFilled = KEY_ROLES.filter((r) => i.contactRoles.includes(r)).length
  const items: ReadyItem[] = [
    { key: 'app', state: i.appCached ? 'ok' : 'todo' },
    { key: 'profile', state: i.profileFilled ? 'ok' : 'todo' },
    {
      key: 'contacts',
      state: !i.contactRoles.includes('it_vendor') ? 'todo' : keyRolesFilled === KEY_ROLES.length ? 'ok' : 'warn',
      detail: `${i.contactRoles.length}`,
    },
    { key: 'pack', state: !i.pack ? 'todo' : i.pack.stale ? 'warn' : 'ok', detail: i.pack ? String(i.pack.updated_at) : undefined },
    { key: 'printed', state: i.printedAt ? 'ok' : 'todo', detail: i.printedAt ? String(i.printedAt) : undefined },
    {
      key: 'ondevice',
      state: i.onDevice === 'available' ? 'ok' : 'bonus',
      detail: i.onDevice === 'available' ? (i.warmed ? 'warm' : 'available') : i.onDevice === 'downloadable' || i.onDevice === 'downloading' ? 'downloadable' : 'none',
    },
  ]
  const required = items.filter((x) => x.key !== 'ondevice')
  return { items, done: required.filter((x) => x.state === 'ok').length, total: required.length }
}
