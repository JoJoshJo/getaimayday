import type { Lang } from '../i18n/messages'
import { FIXIT_TOPICS, type Fixit, type FixitTopic } from './schema'

// Bundled at build time (precached → offline), like the plans.
const files = import.meta.glob<Fixit>('./*/*.json', { eager: true, import: 'default' })

export const rawFixits: Record<string, Record<string, unknown>> = {}
for (const [path, data] of Object.entries(files)) {
  const m = path.match(/^\.\/([a-z]+)\/([a-z0-9-]+)\.json$/)
  if (m) (rawFixits[m[1]] ??= {})[m[2]] = data
}

export function getFixit(lang: Lang, id: string): Fixit | undefined {
  return (rawFixits[lang]?.[id] ?? rawFixits.en?.[id]) as Fixit | undefined
}

export const isFixitTopic = (v: string | undefined): v is FixitTopic => !!v && (FIXIT_TOPICS as readonly string[]).includes(v)
