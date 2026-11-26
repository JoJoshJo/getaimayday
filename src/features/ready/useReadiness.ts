import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { lastWarmEvent, onDeviceAvailability, onWarmEvent } from '../../ai/warmup'
import { packInputHash } from '../../pack/build'
import { PackSchema } from '../../pack/schema'
import { db } from '../../storage/db'
import { useConnection } from '../../ui/useConnection'
import { CONTACT_ROLES, ContactsSchema, hasContact, ProfileSchema } from '../setup/model'
import { readiness } from './readiness'

/** Live readiness for the Get ready screen and the top-bar chip. */
export function useReadiness() {
  const connection = useConnection()
  const rows = useLiveQuery(() => db.kv.bulkGet(['profile', 'contacts', 'pack', 'readiness']), [])
  const [onDevice, setOnDevice] = useState('checking')
  const [warmed, setWarmed] = useState(() => lastWarmEvent()?.outcome === 'warmed')

  useEffect(() => {
    let live = true
    void onDeviceAvailability().then((a) => live && setOnDevice(a))
    const off = onWarmEvent((e) => {
      if (!live) return
      setWarmed(e.outcome === 'warmed')
      if (e.outcome === 'warmed') setOnDevice('available')
    })
    return () => {
      live = false
      off()
    }
  }, [])

  if (!rows) return null
  const p = ProfileSchema.safeParse(rows[0]?.value)
  const c = ContactsSchema.safeParse(rows[1]?.value)
  const pk = PackSchema.safeParse(rows[2]?.value)
  const contacts = c.success ? c.data : {}
  const profile = p.success && p.data.name.trim() ? p.data : null
  const printedAt = (rows[3]?.value as { printed_at?: number } | undefined)?.printed_at ?? null
  return readiness({
    appCached: connection !== 'preparing',
    profileFilled: !!profile,
    contactRoles: CONTACT_ROLES.filter((r) => hasContact(contacts[r])),
    pack: pk.success ? { updated_at: pk.data.updated_at, stale: !!profile && pk.data.input_hash !== packInputHash(profile, contacts) } : null,
    printedAt,
    onDevice,
    warmed,
  })
}
