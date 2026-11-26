import './zodConfig' // first: before any schema is parsed
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts (bundled by Vite, precached by the service worker → work offline).
import '@fontsource-variable/archivo/wdth.css' // weight 100–900 + width 62–125%
import '@fontsource-variable/figtree' // weight 300–900
import '@fontsource/ibm-plex-mono/400.css'
import { startWarmup } from './ai/warmup'
import App from './App.tsx'
import { I18nProvider } from './i18n'
import { applyTokens } from './ui/applyTokens'
import './ui/styles.css'

applyTokens()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)

// (d) After the shell renders: warm the on-device model in the background if the
// Prompt API says it is available. Never blocks the UI; Firebase loads lazily.
startWarmup()
