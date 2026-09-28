import { useState } from 'react'
import { STAGE_MOVERS, STAGE_POTS, TEST_MODE } from '../game/constants.ts'
import { DIFFICULTIES } from '../game/difficulty.ts'
import type { DifficultyId } from '../game/difficulty.ts'
import { useMediaQuery } from '../hooks/useMediaQuery.ts'
import { readLocal, writeLocal } from '../local.ts'
import { t } from '../i18n/index.ts'
import { CardShell } from './CardShell.tsx'
import { Segmented } from './Segmented.tsx'
import { Keycap } from './Keycap.tsx'
import { Stat } from './Stat.tsx'
import { HippoMark, IconChart, IconClose, IconGear, IconPlay, IconRotate, IconTrophy } from './icons.tsx'
import type { MenuTab } from './MenuSheet.tsx'

/** A phone held upright: the one case where turning it shows more of the field ahead. */
const UPRIGHT_PHONE = '(orientation: portrait) and (hover: none) and (max-width: 640px)'
const LANDSCAPE_TIP_KEY = 'flappy-hippo.tip.landscape'

function tipDismissed(): boolean {
  return readLocal(LANDSCAPE_TIP_KEY) === '1'
}

function dismissTip(): void {
  writeLocal(LANDSCAPE_TIP_KEY, '1')
}

interface StartCardProps {
  difficulty: DifficultyId
  best: number
  touch: boolean
  /** The page shows the lettering above the board, so the card need not name the game again. */
  logoAbove: boolean
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
  onDifficulty,
  onStart,
  onOpenMenu,
}: StartCardProps) {
  const upright = useMediaQuery(UPRIGHT_PHONE)
  const [dismissed, setDismissed] = useState(tipDismissed)
  const showTip = upright && !dismissed

  return (
    <CardShell onBackdropTap={onStart} labelledBy="start-title">
      {!logoAbove && <HippoMark width={56} height={54} className="animate-wobble mx-auto -mt-1 mb-1" />}
      <h2 id="start-title" className="t-title text-brand">
        {logoAbove ? t.start.title : 'Flappy Hippo'}
      </h2>

      {best > 0 && (
        <p className="mt-2">
          <Stat icon={<IconTrophy width={18} height={18} />} tone="gold">
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

      {showTip && (
        <p className="tile t-hint mt-3 flex items-center gap-2 py-1.5 pr-1 pl-3 text-left text-[0.8125rem]">
          <IconRotate width={20} height={20} className="shrink-0" />
          <span className="flex-1">{t.start.landscape}</span>
          <button
            type="button"
            className="text-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            onClick={() => {
              dismissTip()
              setDismissed(true)
            }}
            aria-label={t.start.dismiss}
          >
            <IconClose width={16} height={16} />
          </button>
        </p>
      )}

      {/* Test mode brings the stages forward: say so, or it ships that way. */}
      {TEST_MODE && <p className="t-hint mt-3">{t.start.testMode(STAGE_MOVERS, STAGE_POTS)}</p>}
    </CardShell>
  )
}
