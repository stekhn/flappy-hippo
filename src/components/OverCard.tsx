import type { ReactNode } from 'react'
import { difficultyById } from '../game/difficulty.ts'
import { medalFor, nextMedal } from '../game/medals.ts'
import type { Snapshot } from '../game/runtime.ts'
import { canShare } from '../platform.ts'
import { CardShell } from './CardShell.tsx'
import { IconChart, IconMelon, IconRestart, IconShare, IconTrophy } from './icons.tsx'
import type { MenuTab } from './MenuSheet.tsx'

interface OverCardProps {
  snapshot: Snapshot
  touch: boolean
  onRestart: () => void
  onOpenMenu: (tab: MenuTab) => void
}

/** Hands the score to the OS share sheet. Nothing leaves the device unless the player picks a target. */
async function shareScore(snapshot: Snapshot): Promise<void> {
  const level = difficultyById(snapshot.difficulty).label
  const points = `${snapshot.score} ${snapshot.score === 1 ? 'Punkt' : 'Punkte'}`
  try {
    await navigator.share({
      title: 'Flappy Hippo',
      text: `${points} in Flappy Hippo (${level}). Schaffst du mehr?`,
      url: location.href,
    })
  } catch {
    /* the sheet was dismissed, or the platform refused — either way nothing to do */
  }
}

/**
 * The round's result. One number is the hero — this round's score — and everything else is a
 * chip underneath it: the record (gold when it just fell), the melons, the next medal.
 */
export function OverCard({ snapshot, touch, onRestart, onOpenMenu }: OverCardProps) {
  const medal = medalFor(snapshot.score)
  const next = nextMedal(snapshot.score)
  const shareable = canShare() && snapshot.score > 0

  return (
    <CardShell dim onBackdropTap={onRestart} labelledBy="over-title">
      <h2 id="over-title" className="t-heading">
        {snapshot.overTitle}
      </h2>

      {medal && (
        <div
          className="animate-pop mx-auto mt-4 flex h-[4.5rem] w-[4.5rem] flex-col items-center justify-center rounded-full border-[3px]"
          style={{
            borderColor: medal.color,
            background: medal.background,
            color: medal.color,
            boxShadow: `0 4px 0 ${medal.color}`,
          }}
        >
          <IconTrophy width={24} height={24} />
          <span className="t-label mt-0.5 text-[0.75rem]">{medal.label}</span>
        </div>
      )}

      <p className="mt-4">
        <span
          className={`t-number block text-[4rem] ${snapshot.newBest ? 'text-gold' : 'text-brand'}`}
        >
          {snapshot.score}
        </span>
        <span className="t-label block">{snapshot.score === 1 ? 'Punkt' : 'Punkte'}</span>
      </p>

      <ul className="mt-3 flex flex-wrap justify-center gap-2">
        <Chip icon={<IconTrophy width={18} height={18} />} gold={snapshot.newBest ? 'filled' : 'text'}>
          {snapshot.newBest ? (
            'Neuer Rekord'
          ) : (
            <>
              Rekord <span className="t-number">{snapshot.best}</span>
            </>
          )}
        </Chip>
        {snapshot.melons > 0 && (
          <Chip icon={<IconMelon width={18} height={18} className="text-brand" />}>
            <span className="t-number">{snapshot.melons}</span>{' '}
            {snapshot.melons === 1 ? 'Melone' : 'Melonen'}
          </Chip>
        )}
      </ul>

      {next && (
        <p className="mt-3">
          Noch <span className="t-number text-base">{next.from - snapshot.score}</span> Punkte bis{' '}
          {next.label}
        </p>
      )}

      <button type="button" className="btn-primary mt-5 w-full" onClick={onRestart}>
        <IconRestart width={22} height={22} />
        Nochmal
      </button>
      <p className="t-hint mt-2">{touch ? 'Oder irgendwo tippen' : 'Oder Leertaste drücken'}</p>
      <div className="mt-2 flex justify-center gap-1">
        <button type="button" className="btn-ghost" onClick={() => onOpenMenu('scores')}>
          <IconChart width={20} height={20} />
          Rekorde
        </button>
        {shareable && (
          <button type="button" className="btn-ghost" onClick={() => void shareScore(snapshot)}>
            <IconShare width={20} height={20} />
            Teilen
          </button>
        )}
      </div>
    </CardShell>
  )
}

/**
 * A small figure with an icon on the tile surface. A record is always gold, icon and text alike;
 * when it is the news of the round the whole chip fills gold.
 */
function Chip({
  icon,
  gold,
  children,
}: {
  icon: ReactNode
  gold?: 'text' | 'filled'
  children: ReactNode
}) {
  return (
    <li
      className="t-label flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[0.9375rem]"
      style={
        gold === 'filled'
          ? {
              background: 'color-mix(in srgb, var(--game-gold) 20%, transparent)',
              border: '2px solid var(--game-gold)',
              color: 'var(--game-gold-deep)',
            }
          : {
              background: 'var(--game-tile)',
              border: '2px solid var(--game-tile-edge)',
              color: gold ? 'var(--game-gold-deep)' : undefined,
            }
      }
    >
      {icon}
      <span>{children}</span>
    </li>
  )
}
