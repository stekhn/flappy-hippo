export type Locale = 'de' | 'en'

/**
 * The interface follows the browser's first language: German where that is German, English
 * everywhere else. Read once at boot; the game does not switch languages while it runs.
 */
export function detectLocale(): Locale {
  try {
    const first = (navigator.languages?.[0] ?? navigator.language ?? '').toLowerCase()
    return first === 'de' || first.startsWith('de-') ? 'de' : 'en'
  } catch {
    return 'en'
  }
}

export const locale: Locale = typeof navigator === 'undefined' ? 'en' : detectLocale()
