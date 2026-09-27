import { t } from '../i18n/index.ts'

/** The space bar, drawn as a keycap inside a button: "this one also answers to the space bar". */
export function Keycap() {
  return (
    <kbd
      aria-label={t.keycap}
      className="ml-1 inline-flex h-6 min-w-8 items-center justify-center rounded-md border-2 border-current/40 px-1.5 font-sans text-[0.8125rem] leading-none opacity-80"
    >
      ⎵
    </kbd>
  )
}
