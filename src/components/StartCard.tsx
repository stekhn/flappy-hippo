import { DIFFICULTIES } from '../game/difficulty.ts'
import type { DifficultyId } from '../game/difficulty.ts'
import { CardShell } from './CardShell.tsx'
import { Segmented } from './Segmented.tsx'
import { Keycap } from './Keycap.tsx'
import { Stat } from './Stat.tsx'
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
  return (
    <CardShell onBackdropTap={onStart} labelledBy="start-title">
      <HippoMark className="animate-wobble mx-auto -mt-1 mb-1" />
      <h1 id="start-title" className="t-title text-brand">
        Flappy Hippo
      </h1>
      <p className="mt-2">
        {touch ? 'Tippen lässt das Nilpferd fliegen.' : 'Klick oder Leertaste lässt das Nilpferd fliegen.'}
      </p>

      <div className="mt-5">
        <Segmented
          label="Schwierigkeit"
          value={difficulty}
          options={DIFFICULTIES.map((d) => ({ value: d.id, label: d.label }))}
          onChange={onDifficulty}
        />
      </div>

      {best > 0 && (
        <p className="mt-4">
          <Stat icon={<IconTrophy width={18} height={18} />} tone="gold">
            Rekord <span className="t-number">{best}</span>
          </Stat>
        </p>
      )}

      <button type="button" className="btn-primary mt-5 w-full" onClick={onStart}>
        <IconPlay width={22} height={22} />
        Spielen
        {!touch && <Keycap />}
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
