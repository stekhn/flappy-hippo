/** The round plate an achievement's emoji sits on: gold once earned, plain tile until then. */
export function EmojiBadge({ icon, earned }: { icon: string; earned: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl"
      style={
        earned
          ? {
              background: 'color-mix(in srgb, var(--game-gold) 22%, transparent)',
              border: '2px solid var(--game-gold)',
            }
          : { background: 'var(--game-tile)', border: '2px solid var(--game-tile-edge)' }
      }
    >
      {icon}
    </span>
  )
}
