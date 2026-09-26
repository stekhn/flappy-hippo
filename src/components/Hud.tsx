import type { Snapshot } from '../game/runtime.ts'
import { IconMelon, IconMenu, IconPause, IconShield, IconSoundOff, IconSoundOn } from './icons.tsx'

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
              <span className="hud-text tnum text-5xl leading-none font-black">
                {snapshot.score}
              </span>
              <div className="mt-1.5 flex items-center gap-2.5">
                {snapshot.melons > 0 && (
                  <span className="hud-text flex items-center gap-1 text-sm font-semibold">
                    <IconMelon width={16} height={16} />
                    <span className="tnum">{snapshot.melons}</span>
                  </span>
                )}
                {snapshot.shielded && (
                  <span className="hud-text flex items-center gap-1 text-sm font-semibold">
                    <IconShield width={16} height={16} />
                    <span>Schild</span>
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
    </div>
  )
}
