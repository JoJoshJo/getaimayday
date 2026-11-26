import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { pwaOptions } from './src/sw/pwa.config.ts'

/**
 * `vite preview` serves the same security headers as Firebase Hosting
 * (firebase.json, source "**"), so local offline/e2e checks run under the real
 * Content-Security-Policy. Not applied to `vite dev`: HMR needs inline scripts
 * and a websocket the production CSP does not allow.
 */
type FbHeader = { source: string; headers: { key: string; value: string }[] }
const firebase = JSON.parse(readFileSync(new URL('./firebase.json', import.meta.url), 'utf8')) as { hosting: { headers: FbHeader[] } }
const prodHeaders = Object.fromEntries(
  (firebase.hosting.headers.find((h) => h.source === '**')?.headers ?? [])
    // HSTS and upgrade-insecure-requests would break http://localhost.
    .filter((h) => h.key !== 'Strict-Transport-Security')
    .map((h) => [h.key, h.key === 'Content-Security-Policy' ? h.value.replace(/;\s*upgrade-insecure-requests/, '') : h.value]),
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), VitePWA(pwaOptions)],
  preview: { headers: prodHeaders },
})
