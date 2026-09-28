import { STAGE_MOVERS, STAGE_POTS, TEST_MODE } from '../game/constants.ts'
import { DIFFICULTIES } from '../game/difficulty.ts'
import type { DifficultyId } from '../game/difficulty.ts'
import { medalFor } from '../game/medals.ts'
import { t } from '../i18n/index.ts'
import { CardShell } from './CardShell.tsx'
import { Segmented } from './Segmented.tsx'
import { Keycap } from './Keycap.tsx'
import { MedalBadge } from './MedalBadge.tsx'
import { Stat } from './Stat.tsx'
import { IconChart, IconGear, IconPlay, IconTrophy } from './icons.tsx'
import type { MenuTab } from './MenuSheet.tsx'
import { WORDMARK_NIGHT } from './Wordmark.tsx'

interface StartCardProps {
  difficulty: DifficultyId
  best: number
  touch: boolean
  /** The page shows the lettering above the board, so the card need not name the game again. */
  logoAbove: boolean
  dark: boolean
  onDifficulty: (id: DifficultyId) => void
  onStart: () => void
  onOpenMenu: (tab: MenuTab) => void
}

/** The first thing anyone sees: what this is, how to fly, and how hard it should be. */
export function StartCard({
  difficulty,
  best,
  touch,
  logoAbove,
  dark,
  onDifficulty,
  onStart,
  onOpenMenu,
}: StartCardProps) {
  const medal = medalFor(best)

  return (
    <CardShell onBackdropTap={onStart} labelledBy="start-title">
      {!logoAbove && (
        <img
          src="wordmark.webp"
          alt=""
          width={1600}
          height={826}
          decoding="async"
          className="mx-auto mb-1 block h-auto w-full max-w-[15rem]"
          style={{ filter: dark ? `brightness(${WORDMARK_NIGHT})` : undefined }}
        />
      )}
      <h2 id="start-title" className={logoAbove ? 't-title text-brand' : 'sr-only'}>
        {logoAbove ? t.start.title : 'Flappy Hippo'}
      </h2>

      {best > 0 && (
        <p className="mt-2">
          <Stat
            icon={medal ? <MedalBadge medal={medal} size={21} /> : <IconTrophy width={18} height={18} />}
            tone="brand"
          >
            {t.start.record} <span className="t-number">{best}</span>
          </Stat>
        </p>
      )}

      <div className="mt-5">
        <Segmented
          label={t.start.difficulty}
          value={difficulty}
          options={DIFFICULTIES.map((d) => ({ value: d.id, label: t.difficulties[d.id] }))}
          onChange={onDifficulty}
        />
      </div>

      {/* Records and settings sit beside the play button rather than taking a row of their own,
          which is the row the card has no room for on a phone lying on its side. */}
      <div className="mt-5 flex gap-2">
        <button type="button" className="btn-primary min-w-0 flex-1" onClick={onStart}>
          <IconPlay width={22} height={22} />
          {t.start.play}
          {!touch && <Keycap />}
        </button>
        <button
          type="button"
          className="btn-secondary w-14 shrink-0 px-0"
          onClick={() => onOpenMenu('scores')}
          aria-label={t.start.records}
        >
          <IconChart width={20} height={20} />
        </button>
        <button
          type="button"
          className="btn-secondary w-14 shrink-0 px-0"
          onClick={() => onOpenMenu('settings')}
          aria-label={t.start.settings}
        >
          <IconGear width={20} height={20} />
        </button>
      </div>

      {/* Test mode brings the stages forward: say so, or it ships that way. */}
      {TEST_MODE && <p className="t-hint mt-3">{t.start.testMode(STAGE_MOVERS, STAGE_POTS)}</p>}
    </CardShell>
  )
}
