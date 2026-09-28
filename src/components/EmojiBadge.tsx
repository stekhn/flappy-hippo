import { GlossDisc } from './GlossDisc.tsx'

const EARNED = { rim: '#8a5a00', dark: '#c58f10', mid: '#f2c032', light: '#fff5b4' }
const LOCKED = { rim: '#7e8a99', dark: '#9daab9', mid: '#c6d0dc', light: '#f2f6fa' }

/** The round plate an achievement's emoji sits on: gold once earned, grey until then. */
export function EmojiBadge({ icon, earned }: { icon: string; earned: boolean }) {
  return (
    <span aria-hidden="true" className="relative flex h-12 w-12 shrink-0 items-center justify-center text-[1.35rem]">
      <GlossDisc {...(earned ? EARNED : LOCKED)} />
      <span className="relative">{icon}</span>
    </span>
  )
}
