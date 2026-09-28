import type { ReactNode } from 'react'

interface CardShellProps {
  children: ReactNode
  /** Tapping anywhere outside the buttons is itself an input (start, resume). Absent, a tap does nothing. */
  onBackdropTap?: () => void
  /** 'end' drops the card to the bottom of the screen, leaving the hippo in plain sight. */
  align?: 'center' | 'end'
  labelledBy?: string
}

/**
 * Centres one overlay card over the scene and turns a tap on the empty space into an input, or
 * swallows it: after a crash the hands are still tapping, and the round's result must not be
 * skipped by that. No scrim: the glass and the scene's own reaction (the sky falls on a crash)
 * carry the state, and a grey wash would only make the moment dull.
 */
export function CardShell({ children, onBackdropTap, align = 'center', labelledBy }: CardShellProps) {
  return (
    <div
      className={`safe-inset absolute inset-0 z-0 flex justify-center ${
        align === 'end' ? 'items-end' : 'items-center'
      }`}
      onPointerDown={(event) => {
        // The stage below listens for taps too — this one is already spoken for.
        event.stopPropagation()
        onBackdropTap?.()
      }}
    >
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby={labelledBy}
        className="card animate-pop max-h-full w-full max-w-[20rem] overflow-y-auto p-5 text-center"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
