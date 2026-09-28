import { useId } from 'react'
import type { ReactNode } from 'react'

interface GlossDiscProps {
  /** The rim, and the metal from its darkest to its brightest. */
  rim: string
  dark: string
  mid: string
  light: string
}

/** The frame every badge is drawn in: square, filling its box, sitting on the same soft shadow. */
export function BadgeSvg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className="absolute inset-0 h-full w-full"
      style={{ filter: 'drop-shadow(0 3px 3px rgba(10, 22, 46, 0.42))' }}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/** A disc of metal: a rim, a face lit from the upper left, and a bevel around it. */
export function GlossDisc({ rim, dark, mid, light }: GlossDiscProps) {
  const id = useId().replace(/:/g, '')
  return (
    <BadgeSvg>
      <defs>
        <linearGradient id={`face${id}`} x1="0.15" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="0.42" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <linearGradient id={`bevel${id}`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor={rim} stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="31" fill={rim} />
      <circle cx="32" cy="32" r="27" fill={`url(#face${id})`} />
      <circle cx="32" cy="32" r="26" fill="none" stroke={`url(#bevel${id})`} strokeWidth="2.5" />
    </BadgeSvg>
  )
}
