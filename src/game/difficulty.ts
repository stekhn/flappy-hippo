import type { World } from './world.ts'
import { GAP_MARGIN } from './constants.ts'

export type DifficultyId = 'easy' | 'normal' | 'hard'

/** A value that eases from `from` at score 0 to `to` once the ramp is complete. */
type Ramped = readonly [from: number, to: number]

export interface Difficulty {
  id: DifficultyId
  label: string
  /** Scroll speed in world units per second. */
  speed: Ramped
  /** Distance between pipe centres, in world units. */
  spacing: Ramped
  /** Vertical opening between two pipes. */
  gap: Ramped
  /** Score at which the ramp reaches its end values. */
  ramp: number
}

export const DIFFICULTIES: Difficulty[] = [
  {
    id: 'easy',
    label: 'Leicht',
    speed: [128, 172],
    spacing: [218, 252],
    gap: [152, 128],
    ramp: 60,
  },
  {
    id: 'normal',
    label: 'Normal',
    speed: [150, 235],
    spacing: [205, 250],
    gap: [132, 102],
    ramp: 45,
  },
  {
    id: 'hard',
    label: 'Schwer',
    speed: [178, 292],
    spacing: [196, 248],
    gap: [114, 88],
    ramp: 35,
  },
]

export function difficultyById(id: DifficultyId): Difficulty {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1]
}

/** The numbers actually in force at the current score. */
export interface Tuning {
  speed: number
  spacing: number
  gap: number
  /** How far along the ramp we are, 0..1 — also drives the "heat" tint of the HUD. */
  progress: number
}

function lerp([from, to]: Ramped, t: number): number {
  return from + (to - from) * t
}

export function tuningFor(difficulty: Difficulty, score: number, world: World): Tuning {
  const progress = Math.min(score / difficulty.ramp, 1)
  // A short field (a wide laptop window) must not end up with a gap taller than the field itself.
  const room = world.groundY - 2 * GAP_MARGIN
  return {
    speed: lerp(difficulty.speed, progress),
    spacing: lerp(difficulty.spacing, progress),
    gap: Math.min(lerp(difficulty.gap, progress), room),
    progress,
  }
}
