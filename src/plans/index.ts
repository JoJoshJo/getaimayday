import type { Lang } from '../i18n/messages'
import type { Plan } from './schema'

// Plans are bundled into the JS at build time, so they are precached by the
// service worker with the app shell and work offline.
const files = import.meta.glob<Plan>('./*/*.json', { eager: true, import: 'default' })

/** All raw plan files keyed by language then plan id. Unvalidated — see tests/plans.test.ts. */
export const rawPlans: Record<string, Record<string, unknown>> = {}
for (const [path, data] of Object.entries(files)) {
  const m = path.match(/^\.\/([a-z]+)\/([a-z0-9-]+)\.json$/)
  if (!m) continue
  const [, lang, id] = m
  ;(rawPlans[lang] ??= {})[id] = data
}

export function getPlan(lang: Lang, id: string): Plan | undefined {
  return (rawPlans[lang]?.[id] ?? rawPlans.en?.[id]) as Plan | undefined
}
