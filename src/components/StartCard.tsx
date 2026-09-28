import { STAGE_MOVERS, STAGE_POTS, TEST_MODE } from '../game/constants.ts'
import { DIFFICULTIES } from '../game/difficulty.ts'
import type { DifficultyId } from '../game/difficulty.ts'
import { medalFor } from '../game/medals.ts'
import { useMediaQuery } from '../hooks/useMediaQuery.ts'
import { t } from '../i18n/index.ts'
import { CardShell } from './CardShell.tsx'
import { Segmented } from './Segmented.tsx'
import { Keycap } from './Keycap.tsx'
import { MedalBadge } from './MedalBadge.tsx'
import { Stat } from './Stat.tsx'
import { IconChart, IconGear, IconPlay, IconRotate, IconTrophy } from './icons.tsx'
import { WORDMARK_NIGHT } from './Wordmark.tsx'
import type { MenuTab } from './MenuSheet.tsx'

/** A phone held upright: the one case where turning it shows more of the field ahead. */
const UPRIGHT_PHONE = '(orientation: portrait) and (hover: none) and (max-width: 640px)'
interface StartCardProps {
  difficulty: DifficultyId
  best: number
  touch: boolean
  /** The page shows the lettering above the board, so the card need not name the game again. */
  logoAbove: boolean
  dark: boolean
  /** The view is turned a quarter, so the control offers to turn it back. */
  rotated: boolean
  onDifficulty: (id: DifficultyId) => void
  onStart: () => void
  onOpenMenu: (tab: MenuTab) => void
  onTurn: () => void
}

/** The first thing anyone sees: what this is, how to fly, and how hard it should be. */
export function StartCard({
  difficulty,
  best,
  touch,
  logoAbove,
  dark,
  rotated,
  onDifficulty,
  onStart,
  onOpenMenu,
  onTurn,
}: StartCardProps) {
  const medal = medalFor(best)
  const upright = useMediaQuery(UPRIGHT_PHONE)

  // Turned, this is the way back and must not be scrolled out of reach; upright it is only a
  // suggestion, so it waits until after the buttons that matter.
  const turnControl = upright ? (
    <div className={rotated ? 'mb-4' : 'mt-3'}>
      {!rotated && <p className="t-hint mb-2 text-[0.8125rem]">{t.start.landscape}</p>}
      <button type="button" className="btn-secondary w-full" onClick={onTurn}>
        <IconRotate width={20} height={20} />
        {rotated ? t.start.turnBack : t.start.turn}
      </button>
    </div>
  ) : null

  return (
    <CardShell onBackdropTap={onStart} labelledBy="start-title">
      {rotated && turnControl}
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

      {!rotated && turnControl}

      {/* Test mode brings the stages forward: say so, or it ships that way. */}
      {TEST_MODE && <p className="t-hint mt-3">{t.start.testMode(STAGE_MOVERS, STAGE_POTS)}</p>}
    </CardShell>
  )
}
