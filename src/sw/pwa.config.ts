import type { VitePWAOptions } from 'vite-plugin-pwa'
import { tokens } from '../ui/tokens.ts'

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
    background_color: tokens.color.paper.bg,
    theme_color: tokens.color.ink.bg,
  },
  workbox: {
    // Don't add "webmanifest" here: the plugin already precaches it, and a
    // duplicate entry with a different revision makes Workbox throw silently
    // inside sw.js → service worker activates with an EMPTY cache (no offline).
    globPatterns: ['**/*.{js,css,html,svg,png,ico,json,woff2}'],
    // Fonts: only latin + latin-ext subsets are precached (EN/FR need nothing
    // else). Other subsets are still referenced by the @font-face CSS but only
    // download if such characters ever appear. .woff (non-2) is never cached.
    globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese,math,symbols}-*.woff2'],
    navigateFallback: '/index.html',
    cleanupOutdatedCaches: true,
  },
  devOptions: {
    enabled: false,
  },
}
