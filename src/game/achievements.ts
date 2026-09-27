import { STAGE_MOVERS, STAGE_POTS } from './constants.ts'
import type { Progress } from './storage.ts'

/**
 * Small local goals that give a session a reason to keep going. They are checked against the saved
 * progress after every round, so they unlock from the accumulated record and never need a server.
 */
export interface Achievement {
  id: string
  label: string
  hint: string
  /** A single emoji — keeps the list readable without shipping an icon set. */
  icon: string
  reached: (p: Progress) => boolean
  /**
   * The later ones are secret until the player is close: listed as "verborgen" with a word on
   * what brings them out, so a long game keeps something to find. Unlocked ones always show.
   */
  reveal?: { when: (p: Progress) => boolean; hint: string }
}

function anyBest(p: Progress): number {
  return Math.max(p.best.easy, p.best.normal, p.best.hard)
}

function fromScore(score: number): Achievement['reveal'] {
  return { when: (p) => anyBest(p) >= score, hint: `Zeigt sich ab ${score} Punkten` }
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-flight',
    label: 'Erster Flug',
    hint: 'Eine Runde spielen',
    icon: '🦛',
    reached: (p) => p.stats.games >= 1,
  },
  {
    id: 'ten',
    label: 'Zehn am Stück',
    hint: '10 Punkte in einer Runde',
    icon: '🔟',
    reached: (p) => anyBest(p) >= 10,
  },
  {
    id: 'quarter',
    label: 'Im Flow',
    hint: '25 Punkte in einer Runde',
    icon: '🎯',
    reached: (p) => anyBest(p) >= 25,
  },
  {
    id: 'fifty',
    label: 'Fliegendes Nilpferd',
    hint: '50 Punkte in einer Runde',
    icon: '🪽',
    reached: (p) => anyBest(p) >= 50,
  },
  {
    id: 'century',
    label: 'Hundert',
    hint: '100 Punkte in einer Runde',
    icon: '💯',
    reached: (p) => anyBest(p) >= 100,
  },
  {
    id: 'two-hundred',
    label: 'Zweihundert',
    hint: '200 Punkte in einer Runde',
    icon: '🚀',
    reached: (p) => anyBest(p) >= 200,
    reveal: fromScore(100),
  },
  {
    id: 'three-hundred',
    label: 'Dreihundert',
    hint: '300 Punkte in einer Runde',
    icon: '🌟',
    reached: (p) => anyBest(p) >= 300,
    reveal: fromScore(200),
  },
  {
    id: 'five-hundred',
    label: 'Fünfhundert',
    hint: '500 Punkte in einer Runde',
    icon: '👑',
    reached: (p) => anyBest(p) >= 500,
    reveal: fromScore(300),
  },
  {
    id: 'thousand',
    label: 'Tausend',
    hint: '1000 Punkte in einer Runde',
    icon: '🐉',
    reached: (p) => anyBest(p) >= 1000,
    reveal: fromScore(500),
  },
  {
    id: 'melon-10',
    label: 'Melonenfan',
    hint: '10 Melonen einsammeln',
    icon: '🍉',
    reached: (p) => p.stats.melons >= 10,
  },
  {
    id: 'melon-100',
    label: 'Melonenernte',
    hint: '100 Melonen einsammeln',
    icon: '🧺',
    reached: (p) => p.stats.melons >= 100,
  },
  {
    id: 'melon-500',
    label: 'Melonenplantage',
    hint: '500 Melonen einsammeln',
    icon: '🚜',
    reached: (p) => p.stats.melons >= 500,
    reveal: { when: (p) => p.stats.melons >= 100, hint: 'Zeigt sich ab 100 Melonen' },
  },
  {
    id: 'saved',
    label: 'Blase geplatzt',
    hint: 'Einen Treffer mit dem Schild überstehen',
    icon: '🫧',
    reached: (p) => p.stats.saves >= 1,
  },
  {
    id: 'night-owl',
    label: 'Nachtflug',
    hint: 'Eine Runde im dunklen Design spielen',
    icon: '🌙',
    reached: (p) => p.stats.nightGames >= 1,
  },
  {
    id: 'hard-20',
    label: 'Halsbrecherisch',
    hint: '20 Punkte auf der schweren Stufe',
    icon: '🔥',
    reached: (p) => p.best.hard >= 20,
  },
  {
    id: 'hard-100',
    label: 'Eisern',
    hint: '100 Punkte auf der schweren Stufe',
    icon: '🦾',
    reached: (p) => p.best.hard >= 100,
    reveal: { when: (p) => p.best.hard >= 50, hint: 'Zeigt sich ab 50 Punkten auf Schwer' },
  },
  {
    id: 'all-modes',
    label: 'Allrounder',
    hint: 'Auf allen drei Stufen punkten',
    icon: '🏅',
    reached: (p) => p.best.easy > 0 && p.best.normal > 0 && p.best.hard > 0,
  },
  {
    id: 'marathon',
    label: 'Ausdauernd',
    hint: 'Insgesamt 30 Minuten fliegen',
    icon: '⏱️',
    reached: (p) => p.stats.seconds >= 1800,
  },
  {
    id: 'pots-25',
    label: 'Topfsicher',
    hint: '25 Blumentöpfen ausweichen',
    icon: '🪴',
    reached: (p) => p.stats.pots >= 25,
    reveal: fromScore(STAGE_POTS),
  },
  {
    id: 'pots-run-12',
    label: 'Scherbenfrei',
    hint: '12 Blumentöpfen in einer Runde ausweichen',
    icon: '🏺',
    reached: (p) => p.stats.potsRun >= 12,
    reveal: fromScore(STAGE_POTS),
  },
  {
    id: 'movers-run-10',
    label: 'Im Takt',
    hint: '10 wandernde Röhren in einer Runde',
    icon: '🎵',
    reached: (p) => p.stats.moversRun >= 10,
    reveal: fromScore(STAGE_MOVERS),
  },
  {
    id: 'movers-100',
    label: 'Wellenreiter',
    hint: '100 wandernde Röhren passieren',
    icon: '🌊',
    reached: (p) => p.stats.movers >= 100,
    reveal: fromScore(STAGE_MOVERS),
  },
]

/** Ids newly reached by this progress record, in list order. */
export function newlyUnlocked(progress: Progress): string[] {
  return ACHIEVEMENTS.filter((a) => !progress.achievements[a.id] && a.reached(progress)).map(
    (a) => a.id,
  )
}

/** Marks the given ids as unlocked at `at` (pure). */
export function unlock(progress: Progress, ids: string[], at: number): Progress {
  if (ids.length === 0) return progress
  const achievements = { ...progress.achievements }
  for (const id of ids) achievements[id] = at
  return { ...progress, achievements }
}

export function achievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}
