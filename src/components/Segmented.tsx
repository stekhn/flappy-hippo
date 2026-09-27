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

/** A row of mutually exclusive choices — difficulty, theme — as one chunky control. */
export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="tile flex gap-1 rounded-full p-1">
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
            className={`t-label flex-1 rounded-full px-2 py-2 transition-[background-color,color,transform,box-shadow] duration-100 ${
              active ? 'bg-brand text-white shadow-[0_3px_0_var(--game-brand-deep)]' : 'text-muted'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
