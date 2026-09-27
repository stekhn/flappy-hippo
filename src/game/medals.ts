export type MedalId = 'bronze' | 'silver' | 'gold' | 'platinum'

/** The badge a finished round earns. Purely local bragging rights, shown on the game-over card. */
export interface Medal {
  id: MedalId
  from: number
  /** Ring and text colour for the badge. */
  color: string
  /** Fill behind it. */
  background: string
  /** The badge's underside: darker than the ring, so it stands off the card. */
  shade: string
}

export const MEDALS: Medal[] = [
  { id: 'bronze', from: 10, color: '#a2612c', background: 'rgb(203 133 68 / 0.22)', shade: '#6f3f18' },
  { id: 'silver', from: 25, color: '#7c8796', background: 'rgb(148 163 184 / 0.25)', shade: '#4e5866' },
  { id: 'gold', from: 50, color: '#c08307', background: 'rgb(245 180 40 / 0.25)', shade: '#7f5604' },
  {
    id: 'platinum',
    from: 100,
    color: '#3f8f9c',
    background: 'rgb(94 205 220 / 0.25)',
    shade: '#245e68',
  },
]

export function medalFor(score: number): Medal | null {
  let earned: Medal | null = null
  for (const medal of MEDALS) if (score >= medal.from) earned = medal
  return earned
}

/** The next badge within reach, for the "noch N Punkte" nudge. */
export function nextMedal(score: number): Medal | null {
  return MEDALS.find((medal) => score < medal.from) ?? null
}
