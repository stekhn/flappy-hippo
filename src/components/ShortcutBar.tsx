import { t } from '../i18n/index.ts'

export function ShortcutBar({ height }: { height: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center overflow-hidden px-4"
      style={{ height }}
      aria-hidden="true"
    >
      <dl className="t-hint grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 text-[0.875rem]">
        {t.menu.help.shortcuts.map((shortcut) => (
          <div key={shortcut.keys} className="contents">
            <dt className="justify-self-end">
              <kbd className="tile t-label text-ink inline-block rounded-full px-2.5 py-0.5 text-[0.8125rem] whitespace-nowrap">
                {shortcut.keys}
              </kbd>
            </dt>
            <dd className="text-ink">{shortcut.action}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
