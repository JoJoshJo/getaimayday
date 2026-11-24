import { useEffect, useState } from 'react'

export type ConnectionState = 'offlineReady' | 'preparing' | 'offline'

/**
 * offline       → no network (app runs from the service-worker cache)
 * offlineReady  → online and a service worker controls the page (app is cached)
 * preparing     → online, service worker not in control yet (first visit)
 */
export function useConnection(): ConnectionState {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [controlled, setControlled] = useState(() => !!navigator.serviceWorker?.controller)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    const ctrl = () => setControlled(!!navigator.serviceWorker?.controller)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    navigator.serviceWorker?.addEventListener('controllerchange', ctrl)
    navigator.serviceWorker?.ready.then(ctrl).catch(() => {})
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      navigator.serviceWorker?.removeEventListener('controllerchange', ctrl)
    }
  }, [])

  if (!online) return 'offline'
  return controlled ? 'offlineReady' : 'preparing'
}
