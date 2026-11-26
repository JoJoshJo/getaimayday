import './zodConfig' // first: before any schema is parsed
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts (bundled by Vite, precached by the service worker → work offline).
// Google Sans Flex: weight + roundness axes (rond.css, latin 71 KB). Google Sans Code: times and technical bits.
import '@fontsource-variable/google-sans-flex/rond.css'
import '@fontsource-variable/google-sans-code/wght.css'
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
