/**
 * The Pack lives in IndexedDB (kv "pack"), on this device only. Each chunk is
 * saved as soon as it is built, so a build that stops halfway keeps what it made.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../storage/db'
import { store } from '../storage/localAdapter'
import { PACK_SCHEMA_VERSION, PackSchema, type Chunk, type Pack } from './schema'

export async function loadPack(): Promise<Pack | null> {
  const v = await store.getKv('pack')
  const p = PackSchema.safeParse(v)
  return p.success ? p.data : null
}

/** Starts a new build: version + 1, keeps old chunks until each is replaced, clears the failed list. */
export async function beginBuild(inputHash: string, now = Date.now()): Promise<Pack> {
  const old = await loadPack()
  const pack: Pack = old
    ? { ...old, version: old.version + 1, updated_at: now, input_hash: inputHash, failed: {} }
    : { schema: PACK_SCHEMA_VERSION, version: 1, created_at: now, updated_at: now, input_hash: inputHash, chunks: {} }
  await store.setKv('pack', PackSchema.parse(pack))
  return pack
}

export async function saveChunk(key: string, chunk: Chunk, now = Date.now()): Promise<void> {
  await db.transaction('rw', db.kv, async () => {
    const pack = await loadPack()
    if (!pack) throw new Error('No pack build in progress')
    const { [key]: _done, ...failed } = pack.failed ?? {}
    void _done
    await store.setKv('pack', PackSchema.parse({ ...pack, updated_at: now, chunks: { ...pack.chunks, [key]: chunk }, failed }))
  })
}

/** Remembers a part that did not build, so "Retry failed parts" still works after a reload. */
export async function markFailed(key: string, error: string): Promise<void> {
  await db.transaction('rw', db.kv, async () => {
    const pack = await loadPack()
    if (!pack) return
    await store.setKv('pack', PackSchema.parse({ ...pack, failed: { ...pack.failed, [key]: error.slice(0, 300) } }))
  })
}

/**
 * Parts to retry: those that failed, plus any part of the current setup that
 * was never saved (a build stopped halfway). Only when the Pack matches the
 * current setup; otherwise a full build is needed anyway.
 */
export function partsToRetry(pack: Pack | null, inputHash: string, jobKeys: string[]): string[] {
  if (!pack || pack.input_hash !== inputHash) return []
  return jobKeys.filter((k) => k in (pack.failed ?? {}) || !(k in pack.chunks))
}

/** Live Pack (undefined while loading, null if none). */
export function usePack(): Pack | null | undefined {
  return useLiveQuery(async () => {
    const row = await db.kv.get('pack')
    const p = PackSchema.safeParse(row?.value)
    return p.success ? p.data : null
  }, [])
}
