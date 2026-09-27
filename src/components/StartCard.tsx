import { DIFFICULTIES } from '../game/difficulty.ts'
import type { DifficultyId } from '../game/difficulty.ts'
import { CardShell } from './CardShell.tsx'
import { Segmented } from './Segmented.tsx'
import { HippoMark, IconChart, IconGear, IconPlay, IconTrophy } from './icons.tsx'
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
      <HippoMark className="animate-wobble mx-auto -mt-1 mb-1" />
      <h1 id="start-title" className="t-title text-brand">
        Flappy Hippo
      </h1>
      <p className="t-hint mt-2">
        {touch ? 'Tippen lässt das Nilpferd fliegen.' : 'Klick oder Leertaste lässt das Nilpferd fliegen.'}
      </p>

      <div className="mt-5">
        <Segmented
          label="Schwierigkeit"
          value={difficulty}
          options={DIFFICULTIES.map((d) => ({ value: d.id, label: d.label, hint: d.hint }))}
          onChange={onDifficulty}
        />
        <p className="t-hint mt-2">{current.hint}</p>
      </div>

      {best > 0 && (
        <p className="t-label text-gold mt-4 flex items-center justify-center gap-1.5">
          <IconTrophy width={18} height={18} />
          <span>
            Rekord <span className="t-number text-ink">{best}</span>
          </span>
        </p>
      )}

      <button type="button" className="btn-primary mt-5 w-full" onClick={onStart}>
        <IconPlay width={22} height={22} />
        Spielen
      </button>

      <div className="mt-3 flex justify-center gap-1">
        <button type="button" className="btn-ghost" onClick={() => onOpenMenu('scores')}>
          <IconChart width={20} height={20} />
          Rekorde
        </button>
        <button type="button" className="btn-ghost" onClick={() => onOpenMenu('settings')}>
          <IconGear width={20} height={20} />
          Einstellungen
        </button>
      </div>
    </CardShell>
  )
}
