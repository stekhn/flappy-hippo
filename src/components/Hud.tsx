import { useEffect, useState } from "react";
import type { ReactNode, SVGProps } from "react";
import type { Snapshot } from "../game/runtime.ts";
import { t } from "../i18n/index.ts";
import {
  IconMelon,
  IconClose,
  IconMenu,
  IconPause,
  IconRotate,
  IconShield,
  IconSoundOff,
  IconSoundOn,
  IconTrophy,
} from "./icons.tsx";

interface HudProps {
  snapshot: Snapshot;
  sound: boolean;
  /** A key press to call out over the scene; the id restarts the animation on a repeat. */
  flash: { id: number; text: string } | null;
  onToggleSound: () => void;
  onPause: () => void;
  onMenu: () => void;
  /** The view is turned a quarter, so the control offers to turn it back. */
  rotated: boolean;
  /** Absent where turning the view would not help: a desktop, or a phone already on its side. */
  onTurn?: () => void;
  menuOpen: boolean;
}

const NOTICE_MS = 3200;

/** The corner button opens and closes the menu, so the sheet's focus trap must reach it. */
export const MENU_TOGGLE_ID = "menu-toggle";

/**
 * An icon with the same outline the HUD text carries: a copy in the sky colour, stroked wide,
 * under the icon itself, so it reads on the scene like the number next to it.
 */
function Outlined({
  icon: Icon,
}: {
  icon: (props: SVGProps<SVGSVGElement>) => ReactNode;
}) {
  return (
    <span className="relative inline-flex h-[26px] w-[26px]" aria-hidden="true">
      <Icon
        width={26}
        height={26}
        className="text-sky absolute inset-0"
        strokeWidth={6}
      />
      <Icon width={26} height={26} className="relative" />
    </span>
  );
}

/** A new stage called out for a moment: the player must know the rules just changed. */
function StageNotice({ stage }: { stage: number }) {
  const [shown, setShown] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShown(false), NOTICE_MS);
    return () => clearTimeout(timer);
  }, []);
  if (!shown) return null;
  return (
    <p
      className="hud-text animate-notice absolute inset-x-4 top-[30%] text-center text-2xl"
      style={{ color: "var(--game-brand)" }}
      role="status"
    >
      {t.hud.notices[stage]}
    </p>
  );
}

/** The thin layer of chrome over the scene: score, shield, and the two buttons a thumb can reach. */
export function Hud({
  snapshot,
  sound,
  flash,
  rotated,
  menuOpen,
  onToggleSound,
  onPause,
  onMenu,
  onTurn,
}: HudProps) {
  const playing = snapshot.phase === "running" && !snapshot.paused && !menuOpen;
  const countingIn = playing && snapshot.countdown > 0;

  return (
    <div className="safe-inset pointer-events-none absolute inset-0 z-30 flex flex-col">
      {playing && snapshot.stage > 0 && (
        <StageNotice key={snapshot.stage} stage={snapshot.stage} />
      )}
      {playing && flash && (
        <p
          key={flash.id}
          className="hud-text animate-flash absolute inset-x-4 top-[46%] text-center text-xl"
          role="status"
        >
          {flash.text}
        </p>
      )}
      <div className="relative flex items-start justify-between gap-3">
        <button
          id={MENU_TOGGLE_ID}
          type="button"
          className="icon-btn pointer-events-auto"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={playing ? onPause : onMenu}
          aria-label={
            playing ? t.hud.pause : menuOpen ? t.menu.close : t.hud.openMenu
          }
          aria-expanded={playing ? undefined : menuOpen}
        >
          {playing ? <IconPause /> : menuOpen ? <IconClose /> : <IconMenu />}
        </button>
        {/* Only while the round is live: a card is up otherwise, and it carries the numbers. */}
        <div className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center pt-1">
          {playing && (
            <>
              <span
                className="hud-text text-6xl transition-colors"
                style={
                  snapshot.newBest ? { color: "var(--game-gold)" } : undefined
                }
              >
                {snapshot.score}
              </span>
              <div className="mt-1.5 flex items-center gap-3.5">
                {snapshot.newBest && (
                  <span
                    className="hud-text animate-pop flex items-center gap-1 text-lg"
                    style={{ color: "var(--game-gold)" }}
                  >
                    <Outlined icon={IconTrophy} />
                    <span className="-translate-y-0.5">{t.hud.record}</span>
                  </span>
                )}
                {snapshot.melons > 0 && (
                  <span
                    className="hud-text flex items-center gap-1 text-lg"
                    style={{ color: "var(--game-melon)" }}
                  >
                    <Outlined icon={IconMelon} />
                    <span className="-translate-y-0.5 tracking-[0.08em]">
                      ×{snapshot.melons}
                    </span>
                  </span>
                )}
                {snapshot.charges > 0 && (
                  <span
                    className="hud-text flex items-center gap-1 text-lg"
                    style={{ color: "var(--game-shield)" }}
                  >
                    <Outlined icon={IconShield} />
                    <span className="-translate-y-0.5 tracking-[0.08em]">
                      ×{snapshot.charges}
                    </span>
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {!menuOpen && (
          <div className="flex items-start gap-2">
            {onTurn && (
              <button
                type="button"
                className="icon-btn pointer-events-auto"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={onTurn}
                aria-pressed={rotated}
                aria-label={rotated ? t.hud.turnBack : t.hud.turn}
              >
                <IconRotate />
              </button>
            )}
            <button
              type="button"
              className="icon-btn pointer-events-auto"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={onToggleSound}
              aria-pressed={sound}
              aria-label={sound ? t.hud.soundOff : t.hud.soundOn}
            >
              <span key={String(sound)} className="animate-pop inline-flex">
                {sound ? <IconSoundOn /> : <IconSoundOff />}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* The count back in after a pause. Keyed by the digit so each one pops in afresh. */}
      {countingIn && (
        <div
          className="flex flex-1 items-center justify-center"
          aria-live="assertive"
        >
          <span
            key={snapshot.countdown}
            className="hud-text animate-pop text-9xl"
            style={{ color: "var(--game-text)" }}
          >
            {snapshot.countdown}
          </span>
        </div>
      )}
    </div>
  );
}
