/**
 * #/demo-setup (hidden, not in the nav): load FAKE demo data or wipe all local
 * data before filming. The wipe asks for a second tap.
 */
import { useState } from 'react'
import { useI18n } from '../../i18n'
import { navigate } from '../../app/router'
import { loadDemo, resetAll, useDemo } from './demo'

export function DemoSetup() {
  const { t } = useI18n()
  const demo = useDemo()
  const [state, setState] = useState<'idle' | 'loaded' | 'confirm' | 'error'>('idle')

  return (
    <div className="screen demo">
      <p className="kicker mono">{t('demo.kicker')}</p>
      <h1 className="screen__title">{t('demo.title')}</h1>
      <p className="muted setup__intro">{t('demo.intro')}</p>

      <section className="pack__block">
        <h2 className="mono setup__legend">{t('demo.loadTitle')}</h2>
        <p>{t('demo.what')}</p>
        <div className="log__actions">
          <button
            type="button"
            className="btn btn--strong"
            onClick={() =>
              void loadDemo().then(
                () => setState('loaded'),
                () => setState('error'),
              )
            }
          >
            {t('demo.load')}
          </button>
        </div>
        <p role="status" className="mono">
          {state === 'loaded' || demo ? t('demo.loaded') : state === 'error' ? t('setup.notSaved') : ''}
        </p>
        {(state === 'loaded' || demo) && (
          <p className="log__actions">
            <a className="btn" href="#/ready">
              {t('nav.ready')}
            </a>
            <a className="btn" href="#/">
              {t('demo.home')}
            </a>
          </p>
        )}
      </section>

      <section className="pack__block">
        <h2 className="mono setup__legend">{t('demo.resetTitle')}</h2>
        <p>{t('demo.resetWhat')}</p>
        {state !== 'confirm' ? (
          <button type="button" className="btn" onClick={() => setState('confirm')}>
            {t('demo.reset')}
          </button>
        ) : (
          <div className="log__actions" role="alert">
            <button
              type="button"
              className="btn btn--strong"
              onClick={() =>
                void resetAll().then(() => {
                  navigate('/')
                  location.reload()
                })
              }
            >
              {t('demo.resetConfirm')}
            </button>
            <button type="button" className="btn" onClick={() => setState('idle')}>
              {t('preview.cancel')}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
