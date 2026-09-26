import { useCallback, useEffect, useRef, useState } from 'react'
import { GameRuntime } from '../game/runtime.ts'
import type { Snapshot } from '../game/runtime.ts'
import type { DifficultyId } from '../game/difficulty.ts'
import type { GameEvent } from '../game/types.ts'
import { useInstallPrompt } from '../hooks/useInstallPrompt.ts'
import { useProgress } from '../hooks/useProgress.ts'
import { useSettings } from '../hooks/useSettings.ts'
import { useTheme } from '../theme.ts'
import { Hud } from './Hud.tsx'
import { MenuSheet } from './MenuSheet.tsx'
import type { MenuTab } from './MenuSheet.tsx'
import { OverCard } from './OverCard.tsx'
import { PauseCard } from './PauseCard.tsx'
import { StartCard } from './StartCard.tsx'

const INITIAL_SNAPSHOT: Snapshot = {
  phase: 'ready',
  paused: false,
  score: 0,
  best: 0,
  newBest: false,
  shielded: false,
  melons: 0,
  overTitle: 'Vorbei',
  round: 0,
}

/** True on devices whose primary input is a finger — only the wording changes. */
function isTouch(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(hover: none)').matches
}

/**
 * The game screen: a canvas the runtime paints, with the HUD, the overlay cards and the menu in
 * the DOM above it. React never renders a frame — it only reacts to the snapshots the runtime
 * pushes when something it shows actually changed.
 */
export function Game() {
  const { theme, setTheme, resolved } = useTheme()
  const { settings, update } = useSettings()
  const { progress, record, reset } = useProgress()
  const { canInstall, install } = useInstallPrompt()

  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const runtimeRef = useRef<GameRuntime | null>(null)
  const [snapshot, setSnapshot] = useState<Snapshot>(INITIAL_SNAPSHOT)
  const [menu, setMenu] = useState<MenuTab | null>(null)
  const [unlocked, setUnlocked] = useState<string[]>([])
  const [status, setStatus] = useState('')
  const [touch] = useState(isTouch)

  // The runtime outlives every render, so the values it needs at crash time are read from here.
  const latest = useRef({ settings, resolved, record, best: progress.best })
  useEffect(() => {
    latest.current = { settings, resolved, record, best: progress.best }
  })

  const onEvent = useCallback((event: GameEvent) => {
    if (event.type === 'shield') setStatus('Schild eingesammelt')
    if (event.type === 'shield-pop') setStatus('Schild verbraucht')
    if (event.type !== 'crash') return
    const runtime = runtimeRef.current
    if (!runtime) return
    const { resolved: scheme, record: save } = latest.current
    setUnlocked(save({ ...runtime.summary(), night: scheme === 'dark' }))
    setStatus(
      `Vorbei. ${event.score} ${event.score === 1 ? 'Punkt' : 'Punkte'}` +
        (event.newBest ? ', neuer Rekord.' : `, Rekord ${event.best}.`),
    )
  }, [])

  // One runtime for the lifetime of the screen; settings flow in through the setters below.
  useEffect(() => {
    const canvas = canvasRef.current
    const box = boxRef.current
    if (!canvas || !box) return
    const { settings: current, resolved: scheme, best } = latest.current
    const runtime = new GameRuntime({
      canvas,
      box,
      difficulty: current.difficulty,
      best: best[current.difficulty],
      dark: scheme === 'dark',
      sound: current.sound,
      haptics: current.haptics,
      onSnapshot: setSnapshot,
      onEvent,
    })
    runtimeRef.current = runtime
    runtime.start()
    return () => {
      runtime.destroy()
      runtimeRef.current = null
    }
    // Built once for the life of the screen: the values read above are only seeds. Every later
    // change is pushed in through the setters in the effects below, so re-creating the runtime
    // (and with it the round in progress) never happens.
  }, [onEvent])

  useEffect(() => {
    runtimeRef.current?.setTheme(resolved === 'dark')
  }, [resolved])
  useEffect(() => {
    runtimeRef.current?.setSound(settings.sound)
  }, [settings.sound])
  useEffect(() => {
    runtimeRef.current?.setHaptics(settings.haptics)
  }, [settings.haptics])
  useEffect(() => {
    runtimeRef.current?.setDifficulty(settings.difficulty, progress.best[settings.difficulty])
  }, [settings.difficulty, progress.best])

  const flap = useCallback(() => runtimeRef.current?.flap(), [])

  const openMenu = useCallback((tab: MenuTab) => {
    runtimeRef.current?.pause()
    setMenu(tab)
  }, [])

  const restart = useCallback(() => {
    setUnlocked([])
    runtimeRef.current?.restart()
    setStatus('Neue Runde')
  }, [])

  const giveUp = useCallback(() => {
    runtimeRef.current?.surrender()
  }, [])

  // Restarting from the pause card ends the round properly first, so the points still count.
  const restartFromPause = useCallback(() => {
    runtimeRef.current?.surrender()
    restart()
  }, [restart])

  const resetProgress = useCallback(() => {
    reset()
    runtimeRef.current?.setBest(0)
    setStatus('Fortschritt gelöscht')
  }, [reset])

  // Keyboard: space flies, P pauses. Anything typed into a control belongs to that control.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const flapKey = event.code === 'Space' || event.code === 'ArrowUp'
      const pauseKey = event.code === 'KeyP' || event.code === 'Escape'
      if (!flapKey && !pauseKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest('button, input, select, textarea, [contenteditable]')) return
      if (menu !== null) return
      event.preventDefault()
      if (pauseKey) runtimeRef.current?.togglePause()
      else flap()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [flap, menu])

  const showStart = snapshot.phase === 'ready' && menu === null
  const showPause = snapshot.paused && snapshot.phase === 'running' && menu === null
  const showOver = snapshot.phase === 'over' && menu === null

  return (
    <div
      ref={boxRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      onPointerDown={(event) => {
        if (event.button !== 0 && event.pointerType === 'mouse') return
        flap()
      }}
    >
      {/* Shrink-wraps the board, so the HUD, the cards and the sheet line up with its edges
          instead of with the window on a display too large to fill. */}
      <div className="board relative">
        <canvas ref={canvasRef} aria-hidden="true" className="block touch-none select-none" />

        {/* The only in-flight control a keyboard or screen reader needs. */}
        {snapshot.phase === 'running' && !snapshot.paused && (
          <button type="button" className="sr-only" onClick={flap}>
            Fliegen
          </button>
        )}

        <p aria-live="polite" className="sr-only">
          {status}
        </p>

        <Hud
          snapshot={snapshot}
          sound={settings.sound}
          onToggleSound={() => update('sound', !settings.sound)}
          onPause={() => runtimeRef.current?.pause()}
          onMenu={() => openMenu('settings')}
        />

        {showStart && (
          <StartCard
            difficulty={settings.difficulty}
            best={progress.best[settings.difficulty]}
            touch={touch}
            onDifficulty={(id: DifficultyId) => update('difficulty', id)}
            onStart={flap}
            onOpenMenu={openMenu}
          />
        )}

        {showPause && (
          <PauseCard
            score={snapshot.score}
            onResume={() => runtimeRef.current?.resume()}
            onRestart={restartFromPause}
            onGiveUp={giveUp}
          />
        )}

        {showOver && (
          <OverCard
            snapshot={snapshot}
            unlocked={unlocked}
            touch={touch}
            onRestart={restart}
            onOpenMenu={openMenu}
          />
        )}

        {menu !== null && (
          <MenuSheet
            tab={menu}
            settings={settings}
            theme={theme}
            progress={progress}
            canInstall={canInstall}
            onTab={setMenu}
            onClose={() => setMenu(null)}
            onSetting={update}
            onTheme={setTheme}
            onInstall={install}
            onResetProgress={resetProgress}
          />
        )}
      </div>
    </div>
  )
}
