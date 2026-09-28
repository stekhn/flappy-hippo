import { useCallback, useRef, useState } from 'react'
import { newlyUnlocked, unlock } from '../game/achievements.ts'
import {
  clearProgress,
  emptyProgress,
  loadProgress,
  recordRun,
  saveProgress,
} from '../game/storage.ts'
import type { Progress, RunResult } from '../game/storage.ts'

/** The saved record: best scores, lifetime stats, the score table and unlocked achievements. */
export function useProgress() {
  const [progress, setProgress] = useState<Progress>(() =>
    typeof window === 'undefined' ? emptyProgress() : loadProgress(),
  )
  // The game-over card needs the freshly unlocked ids in the same tick the round ends, so the
  // record is folded here and the state update only follows.
  const latest = useRef(progress)

  const record = useCallback((run: RunResult): string[] => {
    const at = Date.now()
    const withRun = recordRun(latest.current, run, at)
    const unlocked = newlyUnlocked(withRun)
    const next = unlock(withRun, unlocked, at)
    latest.current = next
    saveProgress(next)
    setProgress(next)
    return unlocked
  }, [])

  /**
   * Checks a round still in progress against the achievements, folding it in provisionally.
   * Anything reached is unlocked and saved right away — the way a console pops the toast the
   * moment the tenth pipe is behind you, not when you crash — while the run's own stats wait
   * for `record`.
   */
  const preview = useCallback((run: RunResult): string[] => {
    const at = Date.now()
    const unlocked = newlyUnlocked(recordRun(latest.current, run, at))
    if (unlocked.length === 0) return unlocked
    const next = unlock(latest.current, unlocked, at)
    latest.current = next
    saveProgress(next)
    setProgress(next)
    return unlocked
  }, [])

  const reset = useCallback(() => {
    const next = emptyProgress()
    latest.current = next
    clearProgress()
    setProgress(next)
  }, [])

  /** Puts a snapshot back, for the undo the menu offers right after a delete. */
  const restore = useCallback((snapshot: Progress) => {
    latest.current = snapshot
    saveProgress(snapshot)
    setProgress(snapshot)
  }, [])

  return { progress, record, preview, reset, restore }
}
