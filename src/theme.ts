// Colour theme preference: system (follow the OS), light, or dark. Persisted to localStorage and
// applied by writing a resolved light|dark value to <html data-theme> (see ThemeProvider and the
// inline boot script in index.html, which must use the same storage key). The canvas palette is
// derived from the same attribute, so the scene and the chrome switch together.

import { createContext, useContext } from 'react'

export type ThemePref = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Tag' },
  { value: 'dark', label: 'Nacht' },
]

const STORAGE_KEY = 'flappy-hippo.theme'

/** Saved preference, else 'system' (follow the OS). */
export function defaultTheme(): ThemePref {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'system' || saved === 'light' || saved === 'dark') return saved
  } catch {
    /* localStorage may be unavailable (private mode), fall through */
  }
  return 'system'
}

export function persistTheme(theme: ThemePref): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* ignore persistence failure */
  }
}

/** Whether the OS currently prefers a dark colour scheme. */
export function systemPrefersDark(): boolean {
  try {
    return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

interface ThemeContextValue {
  /** The user's preference (may be 'system'). */
  theme: ThemePref
  setTheme: (theme: ThemePref) => void
  /** The concrete theme in effect right now. */
  resolved: ResolvedTheme
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
