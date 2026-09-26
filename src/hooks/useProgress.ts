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

  const reset = useCallback(() => {
    const next = emptyProgress()
    latest.current = next
    clearProgress()
    setProgress(next)
  }, [])

  return { progress, record, reset }
}
