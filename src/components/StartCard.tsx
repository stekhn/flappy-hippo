import { EARLY_STAGES, STAGE_MOVERS, STAGE_POTS } from '../game/constants.ts'
import { DIFFICULTIES } from '../game/difficulty.ts'
import type { DifficultyId } from '../game/difficulty.ts'
import { t } from '../i18n/index.ts'
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
      <HippoMark width={56} height={54} className="animate-wobble mx-auto -mt-1 mb-1" />
      <h1 id="start-title" className="t-title text-brand">
        Flappy Hippo
      </h1>
      <p className="mt-2">{touch ? t.start.tapToFly : t.start.clickToFly}</p>

      <div className="mt-5">
        <Segmented
          label={t.start.difficulty}
          value={difficulty}
          options={DIFFICULTIES.map((d) => ({ value: d.id, label: t.difficulties[d.id] }))}
          onChange={onDifficulty}
        />
      </div>

      {best > 0 && (
        <p className="mt-4">
          <Stat icon={<IconTrophy width={18} height={18} />} tone="gold">
            {t.start.record} <span className="t-number">{best}</span>
          </Stat>
        </p>
      )}

      <button type="button" className="btn-primary mt-5 w-full" onClick={onStart}>
        <IconPlay width={22} height={22} />
        {t.start.play}
        {!touch && <Keycap />}
      </button>

      <div className="mt-3 flex justify-center gap-1">
        <button type="button" className="btn-ghost" onClick={() => onOpenMenu('scores')}>
          <IconChart width={20} height={20} />
          {t.start.records}
        </button>
        <button type="button" className="btn-ghost" onClick={() => onOpenMenu('settings')}>
          <IconGear width={20} height={20} />
          {t.start.settings}
        </button>
      </div>

      {/* The stages were brought forward in code for testing: say so, or it ships that way. */}
      {EARLY_STAGES && <p className="t-hint mt-3">{t.start.testMode(STAGE_MOVERS, STAGE_POTS)}</p>}
    </CardShell>
  )
}
