export type MedalId = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

/** The badge a finished round earns. Purely local bragging rights, shown on the game-over card. */
export interface Medal {
  id: MedalId
  from: number
  /** The metal from its darkest to its brightest, the rim around it, and the ink for mark and name. */
  rim: string
  dark: string
  mid: string
  light: string
  ink: string
  /** The name on a dark card, where the ink would not read. */
  inkDark: string
}

export const MEDALS: Medal[] = [
  { id: 'bronze', from: 10, rim: '#6d3a12', dark: '#9c5420', mid: '#cd7f33', light: '#f7c48c', ink: '#5a2f0e', inkDark: '#e2a166' },
  { id: 'silver', from: 25, rim: '#5f6a75', dark: '#8591a0', mid: '#b7c2ce', light: '#f4f8fc', ink: '#434b54', inkDark: '#cdd7e2' },
  { id: 'gold', from: 50, rim: '#8a5a00', dark: '#c58f10', mid: '#f2c032', light: '#fff5b4', ink: '#6b4300', inkDark: '#ffd45e' },
  { id: 'platinum', from: 100, rim: '#6d6f92', dark: '#a3a6c8', mid: '#dcdff2', light: '#ffffff', ink: '#4c4f74', inkDark: '#d3d6ef' },
  { id: 'diamond', from: 200, rim: '#1c7fbe', dark: '#3fb6e8', mid: '#8fe4fb', light: '#ffffff', ink: '#0f5d94', inkDark: '#84dcf8' },
]

export function medalFor(score: number): Medal | null {
  let earned: Medal | null = null
  for (const medal of MEDALS) if (score >= medal.from) earned = medal
  return earned
}

/** The next badge within reach, for the "N points to go" nudge. */
export function nextMedal(score: number): Medal | null {
  return MEDALS.find((medal) => score < medal.from) ?? null
}
