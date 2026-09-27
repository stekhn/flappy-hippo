import { useEffect, useState } from 'react'
import type { ReactNode, SVGProps } from 'react'
import type { Snapshot } from '../game/runtime.ts'
import { t } from '../i18n/index.ts'
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

const NOTICE_MS = 3200

/**
 * An icon with the same outline the HUD text carries: a copy in the sky colour, stroked wide,
 * under the icon itself, so it reads on the scene like the number next to it.
 */
function Outlined({ icon: Icon }: { icon: (props: SVGProps<SVGSVGElement>) => ReactNode }) {
  return (
    <span className="relative inline-flex h-[22px] w-[22px]" aria-hidden="true">
      <Icon width={22} height={22} className="text-sky absolute inset-0" strokeWidth={6} />
      <Icon width={22} height={22} className="relative" />
    </span>
  )
}

/** A new stage called out for a moment: the player must know the rules just changed. */
function StageNotice({ stage }: { stage: number }) {
  const [shown, setShown] = useState(true)
  useEffect(() => {
    const timer = setTimeout(() => setShown(false), NOTICE_MS)
    return () => clearTimeout(timer)
  }, [])
  if (!shown) return null
  return (
    <p
      className="hud-text animate-notice absolute inset-x-4 top-[30%] text-center text-2xl"
      style={{ color: 'var(--game-brand)' }}
      role="status"
    >
      {t.hud.notices[stage]}
    </p>
  )
}

/** The thin layer of chrome over the scene: score, shield, and the two buttons a thumb can reach. */
export function Hud({ snapshot, sound, onToggleSound, onPause, onMenu }: HudProps) {
  const playing = snapshot.phase === 'running' && !snapshot.paused
  const countingIn = playing && snapshot.countdown > 0

  return (
    <div className="safe-inset pointer-events-none absolute inset-0 z-10 flex flex-col">
      {playing && snapshot.stage > 0 && <StageNotice key={snapshot.stage} stage={snapshot.stage} />}
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          className="icon-btn pointer-events-auto"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onToggleSound}
          aria-pressed={sound}
          aria-label={sound ? t.hud.soundOff : t.hud.soundOn}
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
                    <Outlined icon={IconTrophy} />
                    <span>{t.hud.record}</span>
                  </span>
                )}
                {snapshot.melons > 0 && (
                  <span
                    className="hud-text flex items-center gap-1 text-base"
                    style={{ color: 'var(--game-melon)' }}
                  >
                    <Outlined icon={IconMelon} />
                    <span>{snapshot.melons}</span>
                  </span>
                )}
                {snapshot.charges > 0 && (
                  <span
                    className="hud-text flex items-center gap-1 text-base"
                    style={{ color: 'var(--game-shield)' }}
                  >
                    <Outlined icon={IconShield} />
                    <span>{t.hud.shield(snapshot.charges)}</span>
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
          aria-label={playing ? t.hud.pause : t.hud.openMenu}
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
