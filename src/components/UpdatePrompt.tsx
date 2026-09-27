import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { IconCheck, IconClose, IconRestart } from './icons.tsx'

/** How often an open game asks whether a newer build was published. */
const CHECK_MS = 60 * 60 * 1000

/**
 * The service worker's two messages, in the game's own voice. A new version is offered, never
 * forced — reloading mid-round would cost the player a run — and "ready for offline" shows once.
 */
export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setInterval(() => void registration.update(), CHECK_MS)
    },
  })

  useEffect(() => {
    if (!offlineReady) return
    const timer = setTimeout(() => setOfflineReady(false), 4000)
    return () => clearTimeout(timer)
  }, [offlineReady, setOfflineReady])

  if (!needRefresh && !offlineReady) return null

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-30 flex justify-center px-3"
      style={{ top: 'calc(max(0.75rem, env(safe-area-inset-top)) + 4.25rem)' }}
      role="status"
      aria-live="polite"
    >
      <div className="glass animate-toast-in pointer-events-auto flex items-center gap-3 rounded-[1.25rem] py-2 pr-2 pl-4">
        {needRefresh ? (
          <>
            <span className="t-label">Neue Version verfügbar</span>
            <button
              type="button"
              className="btn-primary px-4 text-[0.9375rem]"
              style={{ minHeight: '2.5rem' }}
              onClick={() => void updateServiceWorker(true)}
            >
              <IconRestart width={18} height={18} />
              Neu laden
            </button>
            <button
              type="button"
              className="icon-btn h-10 w-10"
              aria-label="Später"
              onClick={() => setNeedRefresh(false)}
            >
              <IconClose width={20} height={20} />
            </button>
          </>
        ) : (
          <>
            <IconCheck width={22} height={22} className="text-brand" />
            <span className="t-label pr-2">Bereit für offline</span>
          </>
        )}
      </div>
    </div>
  )
}
