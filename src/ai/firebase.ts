/**
 * Firebase init + App Check + AI Logic instance.
 *
 * - Web config below is public by design (MASTER.md §0 rule 4).
 * - App Check: reCAPTCHA Enterprise in every build; in `vite dev` ONLY, the
 *   App Check debug provider is switched on (token from .env.local, never committed).
 * - Imported lazily (see src/ai/index.ts) so the offline app shell never waits on Firebase.
 */
import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'
import { getAI, GoogleAIBackend } from 'firebase/ai'

export const firebaseConfig = {
  apiKey: 'AIzaSyBEv8Mf0kPDn-1DpCGI6LLW-a4Dp0yPMCs',
  authDomain: 'getaimayday.firebaseapp.com',
  projectId: 'getaimayday',
  storageBucket: 'getaimayday.firebasestorage.app',
  messagingSenderId: '550940735818',
  appId: '1:550940735818:web:b7a94b2181f8466fc769b3',
}

export const app = initializeApp(firebaseConfig)

declare global {
  // Read by the App Check SDK when initializeAppCheck runs.
  var FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string | undefined
}

export type AppCheckStatus = 'recaptcha-enterprise' | 'debug' | 'off'

function initAppCheck(): AppCheckStatus {
  const siteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_KEY
  let debug = false

  // Dev server only. In production builds import.meta.env.DEV is the constant
  // `false`, so this branch (and the env var read) is removed from the bundle.
  // scripts/check-no-secrets.mjs verifies that after every build.
  if (import.meta.env.DEV) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || true
    debug = true
  }

  if (!siteKey) {
    console.warn('[AIMayday] VITE_RECAPTCHA_ENTERPRISE_KEY is not set: App Check is OFF. Cloud AI calls will be rejected (App Check is enforced). On-device AI does not need it.')
    return 'off'
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  })
  return debug ? 'debug' : 'recaptcha-enterprise'
}

/** Must run before any other Firebase service is used. */
export const appCheckStatus: AppCheckStatus = initAppCheck()

/** Firebase AI Logic, Gemini Developer API backend. */
export const ai = getAI(app, { backend: new GoogleAIBackend() })
