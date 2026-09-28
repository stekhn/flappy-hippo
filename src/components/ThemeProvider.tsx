import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ThemeContext, defaultTheme, persistTheme, systemPrefersDark } from '../theme.ts'
import type { ThemePref } from '../theme.ts'

/**
 * Holds the theme preference (persisted), resolves 'system' against the live OS setting, and
 * writes the concrete light|dark value to <html data-theme> so the CSS token overrides apply.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePref>(defaultTheme)
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark)

  // Follow the OS preference live, so 'system' mode flips when the user changes their OS theme.
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  // A layout effect, deliberately: children re-read the CSS palette in their own effects, and
  // React runs all layout effects before any passive one — so the attribute is there in time.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = resolved
    // Keep the browser chrome (status bar, address bar) in step with the sky.
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (meta) meta.content = resolved === 'dark' ? '#111a26' : '#e5f0ff'
  }, [resolved])

  const setTheme = useCallback((next: ThemePref) => {
    setThemeState(next)
    persistTheme(next)
  }, [])

  const value = useMemo(() => ({ theme, setTheme, resolved }), [theme, setTheme, resolved])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
