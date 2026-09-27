export type Locale = 'de' | 'en'

const STORAGE_KEY = 'flappy-hippo.lang'

/**
 * The interface follows the browser's first language: German where that is German, English
 * everywhere else. `?lang=de` or `?lang=en` on the URL overrides that and is remembered (the
 * query string is dropped once the page is up, so a reload would otherwise lose it); `?lang=auto`
 * goes back to the browser's choice. Read once at boot; the game does not switch languages while
 * it runs.
 */
export function detectLocale(): Locale {
  try {
    const param = new URLSearchParams(location.search).get('lang')
    if (param === 'auto') localStorage.removeItem(STORAGE_KEY)
    else if (param === 'de' || param === 'en') localStorage.setItem(STORAGE_KEY, param)
    const forced = localStorage.getItem(STORAGE_KEY)
    if (forced === 'de' || forced === 'en') return forced
  } catch {
    /* no URL or storage to read: the browser decides */
  }
  try {
    const first = (navigator.languages?.[0] ?? navigator.language ?? '').toLowerCase()
    return first === 'de' || first.startsWith('de-') ? 'de' : 'en'
  } catch {
    return 'en'
  }
}

export const locale: Locale = typeof navigator === 'undefined' ? 'en' : detectLocale()
