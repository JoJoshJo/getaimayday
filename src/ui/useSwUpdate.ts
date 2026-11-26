/**
 * Session 12: service worker registration + "a new version is waiting" (vite-plugin-pwa
 * registerType 'prompt', useRegisterSW from virtual:pwa-register/react). See UpdateBanner.tsx.
 */
import { useRegisterSW } from 'virtual:pwa-register/react'

/** Call once, at the top of App, so the service worker is registered on every route. */
export function useSwUpdate() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // A tab left open notices a deploy when the person comes back to it (no timer, no polling).
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) void registration.update().catch(() => {})
      })
    },
  })
  return { needRefresh, reload: () => void updateServiceWorker(true) }
}
