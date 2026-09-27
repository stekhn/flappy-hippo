import type { Snapshot } from '../game/runtime.ts'
import {
  IconMelon,
  IconMenu,
  IconPause,
  IconShield,
  IconSoundOff,
  IconSoundOn,
  IconTrophy,
} from './icons.tsx'

interface HudProps {
  snapshot: Snapshot
  sound: boolean
  onToggleSound: () => void
  onPause: () => void
  onMenu: () => void
}

/** The thin layer of chrome over the scene: score, shield, and the two buttons a thumb can reach. */
export function Hud({ snapshot, sound, onToggleSound, onPause, onMenu }: HudProps) {
  const playing = snapshot.phase === 'running' && !snapshot.paused
  const countingIn = playing && snapshot.countdown > 0

  return (
    <div className="safe-inset pointer-events-none absolute inset-0 z-10 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          className="icon-btn pointer-events-auto"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onToggleSound}
          aria-pressed={sound}
          aria-label={sound ? 'Ton ausschalten' : 'Ton einschalten'}
        >
          {sound ? <IconSoundOn /> : <IconSoundOff />}
        </button>

        {/* Only while the round is live: a card is up otherwise, and it carries the numbers. */}
        <div className="flex min-w-0 flex-col items-center pt-1">
          {playing && (
            <>
              <span
                className="hud-text text-6xl transition-colors"
                style={snapshot.newBest ? { color: 'var(--game-gold)' } : undefined}
              >
                {snapshot.score}
              </span>
              <div className="mt-1.5 flex items-center gap-3">
                {snapshot.newBest && (
                  <span
                    className="hud-text animate-pop flex items-center gap-1 text-base"
                    style={{ color: 'var(--game-gold)' }}
                  >
                    <IconTrophy width={18} height={18} />
                    <span>Rekord</span>
                  </span>
                )}
                {snapshot.melons > 0 && (
                  <span
                    className="hud-text flex items-center gap-1 text-base"
                    style={{ color: 'var(--game-melon)' }}
                  >
                    <IconMelon width={18} height={18} />
                    <span>{snapshot.melons}</span>
                  </span>
                )}
                {snapshot.charges > 0 && (
                  <span
                    className="hud-text flex items-center gap-1 text-base"
                    style={{ color: 'var(--game-shield)' }}
                  >
                    <IconShield width={18} height={18} />
                    <span>{snapshot.charges > 1 ? `Schild ×${snapshot.charges}` : 'Schild'}</span>
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          className="icon-btn pointer-events-auto"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={playing ? onPause : onMenu}
          aria-label={playing ? 'Pause' : 'Menü öffnen'}
        >
          {playing ? <IconPause /> : <IconMenu />}
        </button>
      </div>

      {/* The count back in after a pause. Keyed by the digit so each one pops in afresh. */}
      {countingIn && (
        <div className="flex flex-1 items-center justify-center" aria-live="assertive">
          <span key={snapshot.countdown} className="hud-text animate-pop text-9xl">
            {snapshot.countdown}
          </span>
        </div>
      )}
    </div>
  )
}
