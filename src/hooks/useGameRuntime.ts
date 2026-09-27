import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DifficultyId } from '../game/difficulty.ts'
import { GameRuntime } from '../game/runtime.ts'
import type { Snapshot } from '../game/runtime.ts'
import type { RunResult } from '../game/storage.ts'
import type { GameEvent } from '../game/types.ts'
import type { Settings } from '../settings.ts'

const INITIAL_SNAPSHOT: Snapshot = {
  phase: 'ready',
  paused: false,
  countdown: 0,
  score: 0,
  best: 0,
  newBest: false,
  charges: 0,
  melons: 0,
  overTitle: 'Vorbei',
  round: 0,
  difficulty: 'normal',
}

interface Options {
  settings: Settings
  dark: boolean
  best: Record<DifficultyId, number>
  /** Folds a finished round into the saved record and returns the achievements it unlocked. */
  record: (run: RunResult) => string[]
  /** Checks a round in progress and returns (and unlocks) the achievements it has just reached. */
  preview: (run: RunResult) => string[]
  /** Achievements to show — a toast per id. */
  onUnlock: (ids: string[]) => void
}

/** The handful of verbs the UI can say to the game. Stable for the life of the screen. */
export interface GameControls {
  flap: () => void
  pause: () => void
  resume: () => void
  restart: () => void
  /** Ends the current round properly first, so the points still count. */
  restartFromPause: () => void
  surrender: () => void
  /** Freezes everything while something covers the board (the menu). */
  setSuspended: (suspended: boolean) => void
  /** After the saved record was wiped. */
  clearBest: () => void
}

/**
 * Owns one GameRuntime for the life of the screen and turns its callbacks into React state.
 * The runtime is built once; every later settings change is pushed in through its setters, so a
 * re-render never recreates the round in progress.
 */
export function useGameRuntime({ settings, dark, best, record, preview, onUnlock }: Options) {
  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const runtimeRef = useRef<GameRuntime | null>(null)
  const [snapshot, setSnapshot] = useState<Snapshot>(INITIAL_SNAPSHOT)
  /** What the live region reads out. */
  const [status, setStatus] = useState('')

  // The runtime outlives every render, so the values it needs mid-round are read from here.
  const latest = useRef({ settings, dark, best, record, preview, onUnlock })
  useEffect(() => {
    latest.current = { settings, dark, best, record, preview, onUnlock }
  })

  const onEvent = useCallback((event: GameEvent) => {
    const runtime = runtimeRef.current
    if (!runtime) return
    const { dark: night, record: save, preview: check, onUnlock: show } = latest.current
    // Every point, melon and save can be the one that completes an achievement: check as it
    // happens and toast right away, the way a console does.
    const unlocked =
      event.type === 'crash'
        ? save({ ...runtime.summary(), night })
        : event.type === 'score' || event.type === 'melon' || event.type === 'shield-pop'
          ? check({ ...runtime.summary(), night })
          : []
    if (unlocked.length > 0) {
      runtime.celebrateUnlock()
      show(unlocked)
    }
    switch (event.type) {
      case 'shield':
        setStatus('Schild eingesammelt')
        return
      case 'shield-pop':
        setStatus('Schild verbraucht')
        return
      case 'record':
        setStatus(`Neuer Rekord, ${event.score} Punkte`)
        return
      case 'crash':
        setStatus(
          `Vorbei. ${event.score} ${event.score === 1 ? 'Punkt' : 'Punkte'}` +
            (event.newBest ? ', neuer Rekord.' : `, Rekord ${event.best}.`),
        )
        return
      default:
        return
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const box = boxRef.current
    if (!canvas || !box) return
    const seed = latest.current
    const runtime = new GameRuntime({
      canvas,
      box,
      difficulty: seed.settings.difficulty,
      best: seed.best[seed.settings.difficulty],
      dark: seed.dark,
      sound: seed.settings.sound,
      haptics: seed.settings.haptics,
      onSnapshot: setSnapshot,
      onEvent,
    })
    runtimeRef.current = runtime
    runtime.start()
    // Dev builds expose the runtime so scripts/make-screenshots.ts can stage scenes.
    if (import.meta.env.DEV) (window as Window & { __flappyHippo?: GameRuntime }).__flappyHippo = runtime
    return () => {
      runtime.destroy()
      runtimeRef.current = null
    }
  }, [onEvent])

  useEffect(() => {
    runtimeRef.current?.setTheme(dark)
  }, [dark])
  useEffect(() => {
    runtimeRef.current?.setSound(settings.sound)
  }, [settings.sound])
  useEffect(() => {
    runtimeRef.current?.setHaptics(settings.haptics)
  }, [settings.haptics])
  useEffect(() => {
    runtimeRef.current?.setDifficulty(settings.difficulty, best[settings.difficulty])
  }, [settings.difficulty, best])

  const controls = useMemo<GameControls>(() => {
    const restart = () => {
      runtimeRef.current?.restart()
      setStatus('Neue Runde')
    }
    return {
      flap: () => runtimeRef.current?.flap(),
      pause: () => {
        if (runtimeRef.current?.pause()) setStatus('Pause')
      },
      resume: () => {
        if (runtimeRef.current?.resume()) setStatus('Weiter, es zählt runter')
      },
      restart,
      restartFromPause: () => {
        runtimeRef.current?.surrender()
        restart()
      },
      surrender: () => runtimeRef.current?.surrender(),
      setSuspended: (suspended) => runtimeRef.current?.setSuspended(suspended),
      clearBest: () => {
        runtimeRef.current?.setBest(0)
        setStatus('Fortschritt gelöscht')
      },
    }
  }, [])

  return { boxRef, canvasRef, snapshot, status, controls }
}
