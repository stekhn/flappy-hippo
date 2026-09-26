import { blurIfPointer } from './focus.ts'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  hint?: string
}

interface SegmentedProps<T extends string> {
  label: string
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
}

/** A row of mutually exclusive choices — difficulty, theme — as one 44px-tall control. */
export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="border-line flex gap-1 rounded-xl border p-1"
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.hint}
            onClick={(event) => {
              blurIfPointer(event)
              onChange(option.value)
            }}
            className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-semibold transition-colors ${
              active ? 'bg-brand text-white' : 'text-muted hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
