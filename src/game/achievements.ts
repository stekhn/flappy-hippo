import { STAGE_MOVERS, STAGE_POTS } from './constants.ts'
import type { Progress } from './storage.ts'

export type AchievementId =
  | 'first-flight'
  | 'ten'
  | 'quarter'
  | 'fifty'
  | 'century'
  | 'two-hundred'
  | 'three-hundred'
  | 'five-hundred'
  | 'thousand'
  | 'melon-10'
  | 'melon-100'
  | 'melon-500'
  | 'saved'
  | 'night-owl'
  | 'hard-20'
  | 'hard-100'
  | 'all-modes'
  | 'marathon'
  | 'pots-25'
  | 'pots-run-12'
  | 'movers-run-10'
  | 'movers-100'
  | 'hit-cat'
  | 'hit-dog'
  | 'hit-bin'
  | 'hit-bench'
  | 'hit-post'

/** What brings a secret achievement into view; the interface words it. */
export interface Reveal {
  when: (p: Progress) => boolean
  /** What brings it out, where that can be put in numbers. Without one it stays a secret. */
  hint?: { kind: 'score' | 'hard' | 'melons'; at: number }
}

/**
 * Small local goals that give a session a reason to keep going. They are checked against the saved
 * progress after every round, so they unlock from the accumulated record and never need a server.
 * Their names and descriptions live in the message catalogues (src/i18n), keyed by id.
 */
export interface Achievement {
  id: AchievementId
  /** A single emoji — keeps the list readable without shipping an icon set. */
  icon: string
  reached: (p: Progress) => boolean
  /**
   * The later ones are secret until the player is close: listed as hidden with a word on what
   * brings them out, so a long game keeps something to find. Unlocked ones always show.
   */
  reveal?: Reveal
}

function anyBest(p: Progress): number {
  return Math.max(p.best.easy, p.best.normal, p.best.hard)
}

function fromScore(score: number): Reveal {
  return { when: (p) => anyBest(p) >= score, hint: { kind: 'score', at: score } }
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-flight',
    icon: '🦛',
    reached: (p) => p.stats.games >= 1,
  },
  {
    id: 'ten',
    icon: '🔟',
    reached: (p) => anyBest(p) >= 10,
  },
  {
    id: 'quarter',
    icon: '🎯',
    reached: (p) => anyBest(p) >= 25,
  },
  {
    id: 'fifty',
    icon: '🪽',
    reached: (p) => anyBest(p) >= 50,
  },
  {
    id: 'century',
    icon: '💯',
    reached: (p) => anyBest(p) >= 100,
  },
  {
    id: 'two-hundred',
    icon: '🚀',
    reached: (p) => anyBest(p) >= 200,
    reveal: fromScore(100),
  },
  {
    id: 'three-hundred',
    icon: '🌟',
    reached: (p) => anyBest(p) >= 300,
    reveal: fromScore(200),
  },
  {
    id: 'five-hundred',
    icon: '👑',
    reached: (p) => anyBest(p) >= 500,
    reveal: fromScore(300),
  },
  {
    id: 'thousand',
    icon: '🐉',
    reached: (p) => anyBest(p) >= 1000,
    reveal: fromScore(500),
  },
  {
    id: 'melon-10',
    icon: '🍉',
    reached: (p) => p.stats.melons >= 10,
  },
  {
    id: 'melon-100',
    icon: '🧺',
    reached: (p) => p.stats.melons >= 100,
  },
  {
    id: 'melon-500',
    icon: '🚜',
    reached: (p) => p.stats.melons >= 500,
    reveal: { when: (p) => p.stats.melons >= 100, hint: { kind: 'melons', at: 100 } },
  },
  {
    id: 'saved',
    icon: '🫧',
    reached: (p) => p.stats.saves >= 1,
  },
  {
    id: 'night-owl',
    icon: '🌙',
    reached: (p) => p.stats.nightGames >= 1,
  },
  {
    id: 'hard-20',
    icon: '🔥',
    reached: (p) => p.best.hard >= 20,
  },
  {
    id: 'hard-100',
    icon: '🦾',
    reached: (p) => p.best.hard >= 100,
    reveal: { when: (p) => p.best.hard >= 50, hint: { kind: 'hard', at: 50 } },
  },
  {
    id: 'all-modes',
    icon: '🏅',
    reached: (p) => p.best.easy > 0 && p.best.normal > 0 && p.best.hard > 0,
  },
  {
    id: 'marathon',
    icon: '⏱️',
    reached: (p) => p.stats.seconds >= 1800,
  },
  {
    id: 'pots-25',
    icon: '🪴',
    reached: (p) => p.stats.pots >= 25,
    reveal: fromScore(STAGE_POTS),
  },
  {
    id: 'pots-run-12',
    icon: '🏺',
    reached: (p) => p.stats.potsRun >= 12,
    reveal: fromScore(STAGE_POTS),
  },
  {
    id: 'movers-run-10',
    icon: '🎵',
    reached: (p) => p.stats.moversRun >= 10,
    reveal: fromScore(STAGE_MOVERS),
  },
  {
    id: 'movers-100',
    icon: '🌊',
    reached: (p) => p.stats.movers >= 100,
    reveal: fromScore(STAGE_MOVERS),
  },
  {
    id: 'hit-cat',
    icon: '🐈',
    reached: (p) => p.stats.hitCat >= 1,
    reveal: { when: () => false },
  },
  {
    id: 'hit-dog',
    icon: '🐕',
    reached: (p) => p.stats.hitDog >= 1,
    reveal: { when: () => false },
  },
  {
    id: 'hit-bin',
    icon: '🗑️',
    reached: (p) => p.stats.hitBin >= 1,
    reveal: { when: () => false },
  },
  {
    id: 'hit-bench',
    icon: '🪑',
    reached: (p) => p.stats.hitBench >= 1,
    reveal: { when: () => false },
  },
  {
    id: 'hit-post',
    icon: '📮',
    reached: (p) => p.stats.hitPost >= 1,
    reveal: { when: () => false },
  },
]

/** Ids newly reached by this progress record, in list order. */
export function newlyUnlocked(progress: Progress): string[] {
  return ACHIEVEMENTS.filter((a) => !progress.achievements[a.id] && a.reached(progress)).map((a) => a.id)
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
