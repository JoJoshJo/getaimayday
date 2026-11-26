import type { VitePWAOptions } from 'vite-plugin-pwa'
import { tokens } from '../ui/tokens.ts'

// Service worker + manifest config for vite-plugin-pwa.
// Goal: after the first online load, the app shell, built-in plans (bundled
// into the JS) and all static assets are precached and work fully offline.
export const pwaOptions: Partial<VitePWAOptions> = {
  // Session 12: 'prompt' + useRegisterSW (src/ui/UpdateBanner.tsx): a new version waits
  // until the person presses Reload. Was 'autoUpdate', which left the old build on screen
  // with no sign that a new one was ready. Registration comes from the virtual module,
  // so no injected registerSW.js.
  registerType: 'prompt',
  injectRegister: false,
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
    // public/lab/ = spike S2 test images for the hidden /#/lab page: never precached.
    globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese,math,symbols,canadian-aboriginal,cherokee,nushu,syriac,tifinagh,adlam,symbols2,old-permic}-*.woff2', '**/lab/**'],
    navigateFallback: '/index.html',
    cleanupOutdatedCaches: true,
  },
  devOptions: {
    enabled: false,
  },
}
