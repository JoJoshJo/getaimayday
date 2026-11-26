/**
 * Tiny hash router (no library; works offline from the service-worker cache).
 *
 *   #/                     home
 *   #/plan/<incident>      plan (Session 4 feature 1; feature 2 moves this into an incident)
 *   #/styleguide, #/lab    dev pages
 *
 * Query after "?" is parsed into `query` (e.g. ?by=on-device).
 */
import { useEffect, useState } from 'react'

export type Route = { path: string; parts: string[]; query: URLSearchParams }

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/'
  const [path, qs = ''] = raw.split('?')
  return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(qs) }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash))
  useEffect(() => {
    const on = () => {
      setRoute(parseHash(window.location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export function navigate(path: string): void {
  window.location.hash = path
}
