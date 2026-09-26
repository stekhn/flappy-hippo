import { DIFFICULTIES } from '../game/difficulty.ts'
import type { DifficultyId } from '../game/difficulty.ts'
import { CardShell } from './CardShell.tsx'
import { Segmented } from './Segmented.tsx'
import { IconChart, IconGear, IconPlay, IconTrophy } from './icons.tsx'
import type { MenuTab } from './MenuSheet.tsx'

interface StartCardProps {
  difficulty: DifficultyId
  best: number
  touch: boolean
  onDifficulty: (id: DifficultyId) => void
  onStart: () => void
  onOpenMenu: (tab: MenuTab) => void
}

/** The first thing anyone sees: what this is, how to fly, and how hard it should be. */
export function StartCard({
  difficulty,
  best,
  touch,
  onDifficulty,
  onStart,
  onOpenMenu,
}: StartCardProps) {
  const current = DIFFICULTIES.find((d) => d.id === difficulty) ?? DIFFICULTIES[1]

  return (
    <CardShell align="end" onBackdropTap={onStart} labelledBy="start-title">
      <h1 id="start-title" className="text-brand text-2xl font-black tracking-tight">
        Flappy Hippo
      </h1>
      <p className="text-muted mt-1 text-sm">
        {touch ? 'Tippen lässt das Nilpferd fliegen.' : 'Klick oder Leertaste lässt das Nilpferd fliegen.'}
      </p>

      <div className="mt-4">
        <Segmented
          label="Schwierigkeit"
          value={difficulty}
          options={DIFFICULTIES.map((d) => ({ value: d.id, label: d.label, hint: d.hint }))}
          onChange={onDifficulty}
        />
        <p className="text-muted mt-1.5 text-xs">{current.hint}</p>
      </div>

      {best > 0 && (
        <p className="text-muted mt-4 flex items-center justify-center gap-1.5 text-sm">
          <IconTrophy width={16} height={16} className="text-gold" />
          <span>
            Rekord <span className="tnum text-ink font-semibold">{best}</span>
          </span>
        </p>
      )}

      <button type="button" className="btn-primary mt-4 w-full" onClick={onStart}>
        <IconPlay width={20} height={20} />
        Spielen
      </button>

      <div className="mt-2 flex justify-center gap-1">
        <button type="button" className="btn-ghost text-sm" onClick={() => onOpenMenu('scores')}>
          <IconChart width={18} height={18} />
          Bestenliste
        </button>
        <button type="button" className="btn-ghost text-sm" onClick={() => onOpenMenu('settings')}>
          <IconGear width={18} height={18} />
          Einstellungen
        </button>
      </div>
    </CardShell>
  )
}
