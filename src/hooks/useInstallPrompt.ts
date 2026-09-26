import { useCallback, useEffect, useState } from 'react'

/** Chrome's install prompt event, which is not in the DOM lib yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Captures the browser's "add to home screen" offer so it can be triggered from the menu instead
 * of an unprompted banner. Safari never fires it — there the help text covers the manual route.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setDeferred(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(() => {
    if (!deferred) return
    void deferred.prompt().finally(() => setDeferred(null))
  }, [deferred])

  return { canInstall: deferred !== null, install }
}
