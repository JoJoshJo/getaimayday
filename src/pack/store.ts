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

/** Starts a new build: version + 1, keeps old chunks until each is replaced. */
export async function beginBuild(inputHash: string, now = Date.now()): Promise<Pack> {
  const old = await loadPack()
  const pack: Pack = old
    ? { ...old, version: old.version + 1, updated_at: now, input_hash: inputHash }
    : { schema: PACK_SCHEMA_VERSION, version: 1, created_at: now, updated_at: now, input_hash: inputHash, chunks: {} }
  await store.setKv('pack', PackSchema.parse(pack))
  return pack
}

export async function saveChunk(key: string, chunk: Chunk, now = Date.now()): Promise<void> {
  await db.transaction('rw', db.kv, async () => {
    const pack = await loadPack()
    if (!pack) throw new Error('No pack build in progress')
    await store.setKv('pack', PackSchema.parse({ ...pack, updated_at: now, chunks: { ...pack.chunks, [key]: chunk } }))
  })
}

/** Live Pack (undefined while loading, null if none). */
export function usePack(): Pack | null | undefined {
  return useLiveQuery(async () => {
    const row = await db.kv.get('pack')
    const p = PackSchema.safeParse(row?.value)
    return p.success ? p.data : null
  }, [])
}
