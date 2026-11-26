/**
 * Session 12: "New version ready · Reload" when a new service worker is waiting.
 * Pattern from the vite-plugin-pwa docs (Frameworks → React → Prompt for update,
 * checked 2026-11-26): registerType 'prompt' + useRegisterSW from
 * virtual:pwa-register/react. Never reloads on its own: the person may be in the
 * middle of an incident, so the new version waits until they press Reload.
 * Offline is unchanged: the waiting worker only takes over after the click.
 */
import { RefreshCw } from 'lucide-react'
import { useI18n } from '../i18n'
import { ICON_STROKE } from './icons'

/** Calm info banner under the top bar. role=status is polite: announced, never interrupting. */
export function UpdateBanner({ show, onReload }: { show: boolean; onReload: () => void }) {
  const { t } = useI18n()
  return (
    <div className="update" role="status" aria-live="polite">
      {show && (
        <p className="update__inner">
          <RefreshCw className="update__icon" aria-hidden="true" size={18} strokeWidth={ICON_STROKE} />
          <span className="update__text">{t('update.ready')}</span>
          <button type="button" className="btn btn--strong update__btn" onClick={onReload}>
            {t('update.reload')}
          </button>
        </p>
      )}
    </div>
  )
}
