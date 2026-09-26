import { useCallback, useState } from 'react'
import { DEFAULT_SETTINGS, loadSettings, persistSettings } from '../settings.ts'
import type { Settings } from '../settings.ts'

/** Settings state, written straight back to localStorage on every change. */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() =>
    typeof window === 'undefined' ? DEFAULT_SETTINGS : loadSettings(),
  )

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      persistSettings(next)
      return next
    })
  }, [])

  return { settings, update }
}
