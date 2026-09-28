import { useCallback, useEffect, useRef, useState } from 'react'
import type { DifficultyId } from '../game/difficulty.ts'
import type { Progress } from '../game/storage.ts'
import { useGameRuntime } from '../hooks/useGameRuntime.ts'
import { useInstallPrompt } from '../hooks/useInstallPrompt.ts'
import { useLandscape } from '../hooks/useLandscape.ts'
import { useMediaQuery } from '../hooks/useMediaQuery.ts'
import { useProgress } from '../hooks/useProgress.ts'
import { useRoom } from '../hooks/useRoom.ts'
import { useSettings } from '../hooks/useSettings.ts'
import { useToasts } from '../hooks/useToasts.ts'
import { t } from '../i18n/index.ts'
import { isTouch } from '../platform.ts'
import { useTheme } from '../theme.ts'
import { AchievementToast } from './AchievementToast.tsx'
import { Backdrop } from './Backdrop.tsx'
import { Hud } from './Hud.tsx'
import { MenuSheet } from './MenuSheet.tsx'
import type { MenuTab } from './MenuSheet.tsx'
import { OverCard } from './OverCard.tsx'
import { PauseCard } from './PauseCard.tsx'
import { ShortcutBar } from './ShortcutBar.tsx'
import { StartCard } from './StartCard.tsx'
import { Wordmark } from './Wordmark.tsx'
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

/** How far the lettering reaches past the board's top edge, so it sits on the board, not above it. */
const WORDMARK_DIP = 12

/** Room above the board, in CSS pixels, before the wordmark, its claim, and the shortcut line show. */
const WORDMARK_MIN = 110
const CLAIM_MIN = 170
const SHORTCUTS_MIN = 176

/** A phone held upright: the one case where turning the view shows more of the field ahead. */
const UPRIGHT_PHONE = '(orientation: portrait) and (hover: none) and (max-width: 640px)'

const DIFFICULTY_KEYS: Record<string, DifficultyId | undefined> = { Digit1: 'easy', Digit2: 'normal', Digit3: 'hard' }

/**
 * The game screen: a canvas the runtime paints, with the HUD, the overlay cards and the menu in
 * the DOM above it. React never renders a frame — it only reacts to the snapshots the runtime
 * pushes when something it shows actually changed.
 */
export function Game() {
  const { theme, setTheme, resolved } = useTheme()
  const { settings, update } = useSettings()
  const { progress, record, preview, reset, restore } = useProgress()
  const { canInstall, install } = useInstallPrompt()
  const { rotated, toggle: turnView } = useLandscape()
  const upright = useMediaQuery(UPRIGHT_PHONE)
  const { current: toast, push: showToasts } = useToasts()
  const [menu, setMenu] = useState<MenuTab | null>(menuFromUrl)
  const [touch] = useState(isTouch)
  const [flash, setFlash] = useState<{ id: number; text: string } | null>(null)
  const flashes = useRef(0)
  const say = useCallback((text: string) => setFlash({ id: (flashes.current += 1), text }), [])

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

  const restoreProgress = useCallback(
    (snapshot: Progress) => {
      restore(snapshot)
      controls.restoreBest(snapshot.best[settings.difficulty])
    },
    [controls, restore, settings.difficulty],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest('button, input, select, textarea, [contenteditable]')) return
      if (menu !== null) return
      const { code } = event
      const difficulty = DIFFICULTY_KEYS[code]
      if (code === 'Space' || code === 'ArrowUp') controls.flap()
      else if (code === 'KeyP' && event.shiftKey) controls.freeze()
      else if (code === 'KeyP' || code === 'Escape') {
        if (snapshot.paused) controls.resume()
        else controls.pause()
      } else if (code === 'KeyM') {
        update('sound', !settings.sound)
        say(settings.sound ? t.hud.flash.soundOff : t.hud.flash.soundOn)
      } else if (difficulty) {
        update('difficulty', difficulty)
        say(t.hud.flash.difficulty(t.difficulties[difficulty], snapshot.phase === 'running'))
      } else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [controls, menu, say, settings.sound, snapshot.paused, snapshot.phase, update])

  const room = useRoom(boxRef, canvasRef)
  const showWordmark = room >= WORDMARK_MIN
  const showShortcuts = !touch && room >= SHORTCUTS_MIN

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
      <h1 className="sr-only">Flappy Hippo</h1>
      <Backdrop box={boxRef} canvas={canvasRef} dark={resolved === 'dark'} />

      {showWordmark && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[5] flex items-end justify-center"
          style={{ height: room + WORDMARK_DIP }}
        >
          <Wordmark height={room} claim={room >= CLAIM_MIN ? t.desktop.claim : null} dark={resolved === 'dark'} />
        </div>
      )}
      {showShortcuts && <ShortcutBar height={room} />}

      {/* Shrink-wraps the board, so the HUD, the cards and the sheet line up with its edges
          instead of with the window on a display too large to fill. */}
      <div className="board relative">
        <canvas ref={canvasRef} aria-hidden="true" className="block touch-none select-none" />

        {/* The only in-flight control a keyboard or screen reader needs. */}
        {snapshot.phase === 'running' && !snapshot.paused && (
          <button type="button" className="sr-only" onClick={controls.flap}>
            {t.hud.fly}
          </button>
        )}

        <p aria-live="polite" className="sr-only">
          {status}
        </p>

        <Hud
          snapshot={snapshot}
          sound={settings.sound}
          flash={flash}
          onToggleSound={() => update('sound', !settings.sound)}
          onPause={controls.pause}
          onMenu={() => setMenu((open) => (open === null ? 'settings' : null))}
          menuOpen={menu !== null}
          rotated={rotated}
          onTurn={upright ? turnView : undefined}
        />

        {showStart && (
          <StartCard
            difficulty={settings.difficulty}
            best={progress.best[settings.difficulty]}
            touch={touch}
            logoAbove={showWordmark}
            dark={resolved === 'dark'}
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
            dark={resolved === 'dark'}
            onRestart={controls.restart}
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
            onRestoreProgress={restoreProgress}
          />
        )}
      </div>
    </div>
  )
}
