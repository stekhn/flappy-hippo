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
}

function anyBest(p: Progress): number {
  return Math.max(p.best.easy, p.best.normal, p.best.hard)
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
