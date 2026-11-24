import type { VitePWAOptions } from 'vite-plugin-pwa'

// Service worker + manifest config for vite-plugin-pwa.
// Goal: after the first online load, the app shell, built-in plans (bundled
// into the JS) and all static assets are precached and work fully offline.
export const pwaOptions: Partial<VitePWAOptions> = {
  registerType: 'autoUpdate',
  injectRegister: 'auto',
  pwaAssets: {
    // Generates PNG icons + favicon from public/logo.svg (placeholder logo).
    config: true,
  },
  manifest: {
    name: 'AIMayday',
    short_name: 'AIMayday',
    description: 'Offline incident response helper for small businesses.',
    lang: 'en',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1f2937',
  },
  workbox: {
    // Don't add "webmanifest" here: the plugin already precaches it, and a
    // duplicate entry with a different revision makes Workbox throw silently
    // inside sw.js → service worker activates with an EMPTY cache (no offline).
    globPatterns: ['**/*.{js,css,html,svg,png,ico,json,woff2}'],
    navigateFallback: '/index.html',
    cleanupOutdatedCaches: true,
  },
  devOptions: {
    enabled: false,
  },
}
