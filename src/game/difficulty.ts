import type { World } from './world.ts'
import { GAP_MARGIN, STAGE_MOVERS, STAGE_POTS, STAGE_RAMP } from './constants.ts'

export type DifficultyId = 'easy' | 'normal' | 'hard'

/** A value that eases from `from` at score 0 to `to` once the ramp is complete. */
type Ramped = readonly [from: number, to: number]

export interface Difficulty {
  id: DifficultyId
  /** Scroll speed in world units per second. */
  speed: Ramped
  /** Distance between pipe centres, in world units. */
  spacing: Ramped
  /** Vertical opening between two pipes. */
  gap: Ramped
  /**
   * How far the next gap's centre may sit above or below the previous one. Bounding this is
   * what keeps a tall portrait field exactly as hard as a wide landscape one: the field's height
   * decides how far the gaps may wander over time, never how far they jump from pipe to pipe.
   */
  jump: Ramped
  /** Score at which the ramp reaches its end values. */
  ramp: number
}

export const DIFFICULTIES: Difficulty[] = [
  {
    id: 'easy',
    speed: [128, 172],
    spacing: [218, 252],
    gap: [152, 128],
    jump: [70, 100],
    ramp: 60,
  },
  {
    id: 'normal',
    speed: [150, 235],
    spacing: [205, 250],
    gap: [132, 102],
    jump: [85, 125],
    ramp: 45,
  },
  {
    id: 'hard',
    speed: [178, 292],
    spacing: [196, 248],
    gap: [114, 88],
    jump: [100, 150],
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
  jump: number
  /** How far along the ramp we are, 0..1 — also drives the "heat" tint of the HUD. */
  progress: number
  /** Share of pipe slots that drop a flower pot; 0 before the pot stage. */
  pots: number
  /** Share of pipes that swing up and down; 0 before the mover stage. */
  movers: number
  /** How far a swinging pipe's gap travels above and below its base. */
  swing: number
}

function lerp([from, to]: Ramped, t: number): number {
  return from + (to - from) * t
}

/** A stage value: nothing before the stage's score, then rising over STAGE_RAMP points. */
function stage(score: number, from: number, range: Ramped): number {
  if (score < from) return 0
  return lerp(range, Math.min((score - from) / STAGE_RAMP, 1))
}

export function tuningFor(difficulty: Difficulty, score: number, world: World): Tuning {
  const progress = Math.min(score / difficulty.ramp, 1)
  // A short field (a wide laptop window) must not end up with a gap taller than the field itself.
  const room = world.groundY - 2 * GAP_MARGIN
  return {
    speed: lerp(difficulty.speed, progress),
    spacing: lerp(difficulty.spacing, progress),
    gap: Math.min(lerp(difficulty.gap, progress), room),
    jump: lerp(difficulty.jump, progress),
    progress,
    pots: stage(score, STAGE_POTS, [0.25, 0.45]),
    movers: stage(score, STAGE_MOVERS, [0.35, 0.55]),
    swing: stage(score, STAGE_MOVERS, [26, 40]),
  }
}
