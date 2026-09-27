import type { ReactNode } from 'react'
import { difficultyById } from '../game/difficulty.ts'
import { medalFor, nextMedal } from '../game/medals.ts'
import type { Snapshot } from '../game/runtime.ts'
import { canShare } from '../platform.ts'
import { CardShell } from './CardShell.tsx'
import { IconChart, IconMelon, IconRestart, IconShare, IconStar, IconTrophy } from './icons.tsx'
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

      <dl className="mt-5 grid grid-cols-2 gap-2 text-left">
        <Stat icon={<IconStar width={18} height={18} className="text-brand" />} label="Punkte">
          {snapshot.score}
        </Stat>
        <Stat
          icon={<IconTrophy width={18} height={18} className="text-gold" />}
          label={snapshot.newBest ? 'Neuer Rekord' : 'Rekord'}
          highlight={snapshot.newBest}
        >
          {snapshot.best}
        </Stat>
      </dl>

      {snapshot.melons > 0 && (
        <p className="t-hint mt-3 flex items-center justify-center gap-1.5">
          <IconMelon width={18} height={18} />
          <span className="t-number text-ink text-base">{snapshot.melons}</span>
          {snapshot.melons === 1 ? 'Melone eingesammelt' : 'Melonen eingesammelt'}
        </p>
      )}

      {next && !snapshot.newBest && (
        <p className="t-hint mt-3">
          Noch <span className="t-number text-ink text-base">{next.from - snapshot.score}</span>{' '}
          Punkte bis {next.label}
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

function Stat({
  icon,
  label,
  highlight = false,
  children,
}: {
  icon: ReactNode
  label: string
  highlight?: boolean
  children: ReactNode
}) {
  return (
    <div className="tile px-4 py-3">
      <dt className="t-hint flex items-center gap-1.5 text-[0.875rem]">
        {icon}
        {label}
      </dt>
      <dd className={`t-number mt-1 text-[1.75rem] ${highlight ? 'text-gold' : ''}`}>{children}</dd>
    </div>
  )
}
