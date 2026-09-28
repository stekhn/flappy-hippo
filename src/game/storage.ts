import { dropLocal, readLocal, writeLocal } from '../local.ts'
import type { DifficultyId } from './difficulty.ts'
import type { RunSummary } from './types.ts'

// Everything the game remembers lives in localStorage under one key, so a single read on boot
// restores records, stats, the score table and unlocked achievements. There is no account and no
// network: clearing site data really is a full reset.

const PROGRESS_KEY = 'flappy-hippo.progress'
const LEGACY_BEST_KEY = 'flappy-hippo-best'
const MAX_SCORES = 10

export interface Stats {
  games: number
  points: number
  pipes: number
  melons: number
  /** Shields collected. */
  shields: number
  /** Hits a shield absorbed. */
  saves: number
  /** Rounds played with the dark theme on. */
  nightGames: number
  seconds: number
  /** Flower pots dodged, all time and the most in one round. */
  pots: number
  potsRun: number
  /** Moving pipes cleared, all time and the most in one round. */
  movers: number
  moversRun: number
  /** Rounds that ended on a cat, a dog, a bin, a bench or a postbox. */
  hitCat: number
  hitDog: number
  hitBin: number
  hitBench: number
  hitPost: number
}

export interface ScoreEntry {
  score: number
  difficulty: DifficultyId
  melons: number
  /** Epoch milliseconds. */
  at: number
}

export interface Progress {
  version: 1
  best: Record<DifficultyId, number>
  stats: Stats
  scores: ScoreEntry[]
  /** Achievement id to the moment it was unlocked. */
  achievements: Record<string, number>
}

export const EMPTY_STATS: Stats = {
  games: 0,
  points: 0,
  pipes: 0,
  melons: 0,
  shields: 0,
  saves: 0,
  nightGames: 0,
  seconds: 0,
  pots: 0,
  potsRun: 0,
  movers: 0,
  moversRun: 0,
  hitCat: 0,
  hitDog: 0,
  hitBin: 0,
  hitBench: 0,
  hitPost: 0,
}

export function emptyProgress(): Progress {
  return {
    version: 1,
    best: { easy: 0, normal: 0, hard: 0 },
    stats: { ...EMPTY_STATS },
    scores: [],
    achievements: {},
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** Merges whatever is in storage onto a fresh record, so a half-written or older save still loads. */
export function parseProgress(raw: string | null, legacyBest: string | null = null): Progress {
  const base = emptyProgress()
  const legacy = num(Number(legacyBest))
  if (legacy > 0) base.best.normal = legacy
  if (!raw) return base
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return base
  }
  if (!isRecord(parsed)) return base

  if (isRecord(parsed.best)) {
    for (const id of ['easy', 'normal', 'hard'] as const) {
      base.best[id] = Math.max(base.best[id], Math.floor(num(parsed.best[id])))
    }
  }
  if (isRecord(parsed.stats)) {
    for (const key of Object.keys(EMPTY_STATS) as (keyof Stats)[]) {
      base.stats[key] = num(parsed.stats[key])
    }
  }
  if (Array.isArray(parsed.scores)) {
    base.scores = parsed.scores
      .filter(isRecord)
      .map((entry) => ({
        score: Math.floor(num(entry.score)),
        difficulty: (entry.difficulty === 'easy' || entry.difficulty === 'hard'
          ? entry.difficulty
          : 'normal') as DifficultyId,
        melons: Math.floor(num(entry.melons)),
        at: num(entry.at),
      }))
      .sort(byScore)
      .slice(0, MAX_SCORES)
  }
  if (isRecord(parsed.achievements)) {
    for (const [id, at] of Object.entries(parsed.achievements)) base.achievements[id] = num(at)
  }
  return base
}

function byScore(a: ScoreEntry, b: ScoreEntry): number {
  return b.score - a.score || b.at - a.at
}

export function loadProgress(): Progress {
  return parseProgress(readLocal(PROGRESS_KEY), readLocal(LEGACY_BEST_KEY))
}

export function saveProgress(progress: Progress): void {
  writeLocal(PROGRESS_KEY, JSON.stringify(progress))
}

export function clearProgress(): void {
  dropLocal(PROGRESS_KEY, LEGACY_BEST_KEY)
}

/** What one finished round contributed: the runtime's numbers, plus the sky it was played under. */
export interface RunResult extends RunSummary {
  night: boolean
}

/** Folds a finished round into the saved progress and returns the new record (pure). */
export function recordRun(progress: Progress, run: RunResult, at: number): Progress {
  const stats: Stats = {
    games: progress.stats.games + 1,
    points: progress.stats.points + run.score,
    pipes: progress.stats.pipes + run.pipes,
    melons: progress.stats.melons + run.melons,
    shields: progress.stats.shields + run.shields,
    saves: progress.stats.saves + run.saves,
    nightGames: progress.stats.nightGames + (run.night ? 1 : 0),
    seconds: progress.stats.seconds + run.seconds,
    pots: progress.stats.pots + run.pots,
    potsRun: Math.max(progress.stats.potsRun, run.pots),
    movers: progress.stats.movers + run.movers,
    moversRun: Math.max(progress.stats.moversRun, run.movers),
    hitCat: progress.stats.hitCat + (run.hit === 'cat' ? 1 : 0),
    hitDog: progress.stats.hitDog + (run.hit === 'dog' ? 1 : 0),
    hitBin: progress.stats.hitBin + (run.hit === 'bin' ? 1 : 0),
    hitBench: progress.stats.hitBench + (run.hit === 'bench' ? 1 : 0),
    hitPost: progress.stats.hitPost + (run.hit === 'postbox' ? 1 : 0),
  }
  const scores =
    run.score > 0
      ? [
          ...progress.scores,
          { score: run.score, difficulty: run.difficulty, melons: run.melons, at },
        ]
          .sort(byScore)
          .slice(0, MAX_SCORES)
      : progress.scores
  return {
    ...progress,
    best: {
      ...progress.best,
      [run.difficulty]: Math.max(progress.best[run.difficulty], run.score),
    },
    stats,
    scores,
  }
}
