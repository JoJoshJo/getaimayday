/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** reCAPTCHA Enterprise site key for App Check (public). */
  readonly VITE_RECAPTCHA_ENTERPRISE_KEY?: string
  /** App Check debug token. DEV ONLY, lives in .env.local, never committed. */
  readonly VITE_APPCHECK_DEBUG_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
