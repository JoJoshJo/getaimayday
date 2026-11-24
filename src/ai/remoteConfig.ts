/**
 * Remote Config: lets us change the cloud model without a redeploy.
 *
 * Offline behaviour (verified in @firebase/remote-config 0.10.0 source):
 * activated values are persisted in IndexedDB ("firebase_remote_config").
 * ensureInitialized() loads them; before any fetch, defaultConfig applies.
 * So offline we always get the last activated value or the default.
 */
import { ensureInitialized, fetchAndActivate, getRemoteConfig, getString, isSupported, type RemoteConfig } from 'firebase/remote-config'
import { app } from './firebase'

/** In-app defaults. Must match the parameters created in the Firebase console. */
export const RC_DEFAULTS = {
  cloud_model: 'gemini-3.5-flash-lite',
} as const

export type RcStatus = 'fetched' | 'cached-or-default' | 'unsupported' | 'error'

let rc: RemoteConfig | null = null
let ready: Promise<RcStatus> | null = null

export function initRemoteConfig(): Promise<RcStatus> {
  ready ??= (async () => {
    if (!(await isSupported())) return 'unsupported'
    rc = getRemoteConfig(app)
    rc.settings.minimumFetchIntervalMillis = import.meta.env.DEV ? 60_000 : 12 * 60 * 60 * 1000
    rc.settings.fetchTimeoutMillis = 8_000
    rc.defaultConfig = { ...RC_DEFAULTS }
    await ensureInitialized(rc) // loads persisted values; works offline
    if (!navigator.onLine) return 'cached-or-default'
    try {
      await fetchAndActivate(rc)
      return 'fetched'
    } catch (e) {
      console.warn('[AIMayday] Remote Config fetch failed; using cached/default values.', e)
      return 'cached-or-default'
    }
  })().catch((e) => {
    console.warn('[AIMayday] Remote Config unavailable; using defaults.', e)
    return 'error' as const
  })
  return ready
}

/** Cloud model id. Never throws; falls back to the in-app default. */
export function getCloudModel(): string {
  if (!rc) return RC_DEFAULTS.cloud_model
  return getString(rc, 'cloud_model').trim() || RC_DEFAULTS.cloud_model
}
