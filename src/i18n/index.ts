// The interface's words, in the browser's language. `t` is the active catalogue: English unless
// the browser's first language is German. Catalogues are typed against the English one, so a
// missing or misspelt key fails the build rather than showing up as a blank in one language.
import { de } from './de.ts'
import { en } from './en.ts'
import type { Messages } from './en.ts'
import { locale } from './locale.ts'

export { locale }
export type { Locale } from './locale.ts'
export type { Messages }

export const t: Messages = locale === 'de' ? de : en

const numbers = new Intl.NumberFormat(locale)
const dates = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })

export const formatNumber = (n: number): string => numbers.format(n)
export const formatDate = (epochMs: number): string => dates.format(epochMs)
