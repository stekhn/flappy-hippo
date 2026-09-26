import type { ReactNode } from 'react'
import { achievementById } from '../game/achievements.ts'
import { medalFor, nextMedal } from '../game/medals.ts'
import type { Snapshot } from '../game/runtime.ts'
import { CardShell } from './CardShell.tsx'
import { IconChart, IconMelon, IconRestart, IconStar, IconTrophy } from './icons.tsx'
import type { MenuTab } from './MenuSheet.tsx'

interface OverCardProps {
  snapshot: Snapshot
  /** Achievement ids this round unlocked, shown once before they move to the menu. */
  unlocked: string[]
  touch: boolean
  onRestart: () => void
  onOpenMenu: (tab: MenuTab) => void
}

export function OverCard({ snapshot, unlocked, touch, onRestart, onOpenMenu }: OverCardProps) {
  const medal = medalFor(snapshot.score)
  const next = nextMedal(snapshot.score)

  return (
    <CardShell dim onBackdropTap={onRestart} labelledBy="over-title">
      <h2 id="over-title" className="text-xl font-black">
        {snapshot.overTitle}
      </h2>

      {medal && (
        <div
          className="mx-auto mt-3 flex h-16 w-16 flex-col items-center justify-center rounded-full border-2"
          style={{ borderColor: medal.color, background: medal.background, color: medal.color }}
        >
          <IconTrophy width={22} height={22} />
          <span className="mt-0.5 text-[0.625rem] font-bold tracking-wide uppercase">
            {medal.label}
          </span>
        </div>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-2 text-left">
        <Stat icon={<IconStar width={16} height={16} className="text-brand" />} label="Punkte">
          {snapshot.score}
        </Stat>
        <Stat
          icon={<IconTrophy width={16} height={16} className="text-gold" />}
          label={snapshot.newBest ? 'Neuer Rekord' : 'Rekord'}
          highlight={snapshot.newBest}
        >
          {snapshot.best}
        </Stat>
      </dl>

      {snapshot.melons > 0 && (
        <p className="text-muted mt-2 flex items-center justify-center gap-1.5 text-sm">
          <IconMelon width={16} height={16} />
          <span className="tnum">{snapshot.melons}</span> Melonen eingesammelt
        </p>
      )}

      {unlocked.length > 0 && (
        <ul className="mt-3 space-y-1">
          {unlocked.map((id) => {
            const achievement = achievementById(id)
            if (!achievement) return null
            return (
              <li
                key={id}
                className="border-line bg-surface flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm"
              >
                <span aria-hidden="true" className="text-lg">
                  {achievement.icon}
                </span>
                <span>
                  <span className="font-semibold">{achievement.label}</span>
                  <span className="text-muted block text-xs">Erfolg freigeschaltet</span>
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {next && !snapshot.newBest && (
        <p className="text-muted mt-3 text-xs">
          Noch <span className="tnum font-semibold">{next.from - snapshot.score}</span> Punkte bis{' '}
          {next.label}
        </p>
      )}

      <button type="button" className="btn-primary mt-4 w-full" onClick={onRestart}>
        <IconRestart width={20} height={20} />
        Nochmal
      </button>
      <p className="text-muted mt-2 text-xs">
        {touch ? 'Oder irgendwo tippen' : 'Oder Leertaste drücken'}
      </p>
      <button
        type="button"
        className="btn-ghost mt-1 w-full text-sm"
        onClick={() => onOpenMenu('scores')}
      >
        <IconChart width={18} height={18} />
        Bestenliste
      </button>
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
    <div className="border-line bg-surface rounded-xl border px-3 py-2">
      <dt className="text-muted flex items-center gap-1.5 text-xs">
        {icon}
        {label}
      </dt>
      <dd className={`tnum text-xl font-bold ${highlight ? 'text-brand' : ''}`}>{children}</dd>
    </div>
  )
}
