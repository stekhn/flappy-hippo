import { blurIfPointer } from './focus.ts'

interface ToggleProps {
  label: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

/** A labelled switch, sized for a thumb. */
export function Toggle({ label, hint, checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(event) => {
        blurIfPointer(event)
        onChange(!checked)
      }}
      className="tile flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
    >
      <span className="min-w-0">
        <span className="t-label block">{label}</span>
        {hint && <span className="t-hint block">{hint}</span>}
      </span>
      <span
        aria-hidden="true"
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${checked ? 'bg-brand' : 'bg-ink/20'}`}
        style={checked ? { boxShadow: 'inset 0 -3px 0 var(--game-brand-deep)' } : undefined}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-[left] ${
            checked ? 'left-7' : 'left-1'
          }`}
        />
      </span>
    </button>
  )
}
