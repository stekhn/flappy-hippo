import type { ReactNode } from 'react'

interface CardShellProps {
  children: ReactNode
  /** Tapping anywhere outside the buttons is itself an input (start, resume, restart). */
  onBackdropTap?: () => void
  /** Darkens the scene behind the card — used when the round is over or paused. */
  dim?: boolean
  /** 'end' drops the card to the bottom of the screen, leaving the hippo in plain sight. */
  align?: 'center' | 'end'
  labelledBy?: string
}

/** Centres one overlay card over the scene and turns a tap on the empty space into an input. */
export function CardShell({
  children,
  onBackdropTap,
  dim = false,
  align = 'center',
  labelledBy,
}: CardShellProps) {
  return (
    <div
      className={`safe-inset animate-fade absolute inset-0 z-0 flex justify-center ${
        align === 'end' ? 'items-end' : 'items-center'
      } ${dim ? 'bg-black/20' : ''}`}
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
        className="card animate-pop max-h-full w-full max-w-[22rem] overflow-y-auto p-5 text-center"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
