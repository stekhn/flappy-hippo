import { useCallback, useEffect, useState } from 'react'
import type { DifficultyId } from '../game/difficulty.ts'
import { useGameRuntime } from '../hooks/useGameRuntime.ts'
import { useInstallPrompt } from '../hooks/useInstallPrompt.ts'
import { useProgress } from '../hooks/useProgress.ts'
import { useSettings } from '../hooks/useSettings.ts'
import { useToasts } from '../hooks/useToasts.ts'
import { isTouch } from '../platform.ts'
import { useTheme } from '../theme.ts'
import { AchievementToast } from './AchievementToast.tsx'
import { Hud } from './Hud.tsx'
import { MenuSheet } from './MenuSheet.tsx'
import type { MenuTab } from './MenuSheet.tsx'
import { OverCard } from './OverCard.tsx'
import { PauseCard } from './PauseCard.tsx'
import { StartCard } from './StartCard.tsx'
import { UpdatePrompt } from './UpdatePrompt.tsx'

/** An app shortcut (or a shared link) may ask for a menu tab: ?menu=scores. */
function menuFromUrl(): MenuTab | null {
  try {
    const tab = new URLSearchParams(location.search).get('menu')
    return tab === 'settings' || tab === 'scores' || tab === 'awards' || tab === 'help' ? tab : null
  } catch {
    return null
  }
}

/**
 * The game screen: a canvas the runtime paints, with the HUD, the overlay cards and the menu in
 * the DOM above it. React never renders a frame — it only reacts to the snapshots the runtime
 * pushes when something it shows actually changed.
 */
export function Game() {
  const { theme, setTheme, resolved } = useTheme()
  const { settings, update } = useSettings()
  const { progress, record, preview, reset } = useProgress()
  const { canInstall, install } = useInstallPrompt()
  const { current: toast, push: showToasts } = useToasts()
  const [menu, setMenu] = useState<MenuTab | null>(menuFromUrl)
  const [touch] = useState(isTouch)

  // The query string has done its job once the menu is open; a reload should not reopen it.
  useEffect(() => {
    if (location.search) history.replaceState(null, '', location.pathname)
  }, [])

  const { boxRef, canvasRef, snapshot, status, controls } = useGameRuntime({
    settings,
    dark: resolved === 'dark',
    best: progress.best,
    record,
    preview,
    onUnlock: showToasts,
  })

  // The menu covers the board: nothing moves underneath it, and a live round waits paused.
  useEffect(() => {
    controls.setSuspended(menu !== null)
  }, [controls, menu])

  const closeMenu = useCallback(() => setMenu(null), [])

  const resetProgress = useCallback(() => {
    reset()
    controls.clearBest()
  }, [controls, reset])

  // Keyboard: space flies, P pauses, Shift+P freezes the frame with no card over it (for a
  // screenshot). Anything typed into a control belongs to that control.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const flapKey = event.code === 'Space' || event.code === 'ArrowUp'
      const pauseKey = event.code === 'KeyP' || event.code === 'Escape'
      if (!flapKey && !pauseKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest('button, input, select, textarea, [contenteditable]')) return
      if (menu !== null) return
      event.preventDefault()
      if (flapKey) controls.flap()
      else if (event.code === 'KeyP' && event.shiftKey) controls.freeze()
      else if (snapshot.paused) controls.resume()
      else controls.pause()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [controls, menu, snapshot.paused])

  const showStart = snapshot.phase === 'ready' && menu === null
  const showPause = snapshot.paused && snapshot.phase === 'running' && menu === null
  const showOver = snapshot.phase === 'over' && menu === null

  return (
    <div
      ref={boxRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      onPointerDown={(event) => {
        if (event.button !== 0 && event.pointerType === 'mouse') return
        controls.flap()
      }}
    >
      {/* Shrink-wraps the board, so the HUD, the cards and the sheet line up with its edges
          instead of with the window on a display too large to fill. */}
      <div className="board relative">
        <canvas ref={canvasRef} aria-hidden="true" className="block touch-none select-none" />

        {/* The only in-flight control a keyboard or screen reader needs. */}
        {snapshot.phase === 'running' && !snapshot.paused && (
          <button type="button" className="sr-only" onClick={controls.flap}>
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
          onPause={controls.pause}
          onMenu={() => setMenu('settings')}
        />

        {showStart && (
          <StartCard
            difficulty={settings.difficulty}
            best={progress.best[settings.difficulty]}
            touch={touch}
            onDifficulty={(id: DifficultyId) => update('difficulty', id)}
            onStart={controls.flap}
            onOpenMenu={setMenu}
          />
        )}

        {showPause && (
          <PauseCard
            score={snapshot.score}
            touch={touch}
            onResume={controls.resume}
            onRestart={controls.restartFromPause}
            onGiveUp={controls.surrender}
          />
        )}

        {showOver && (
          <OverCard
            snapshot={snapshot}
            touch={touch}
            onRestart={controls.restart}
            onOpenMenu={setMenu}
          />
        )}

        <AchievementToast toast={toast} />
        <UpdatePrompt />

        {menu !== null && (
          <MenuSheet
            tab={menu}
            settings={settings}
            theme={theme}
            progress={progress}
            canInstall={canInstall}
            onTab={setMenu}
            onClose={closeMenu}
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
