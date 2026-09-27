import { medalFor, nextMedal } from '../game/medals.ts'
import type { Snapshot } from '../game/runtime.ts'
import { Fill } from '../i18n/Fill.tsx'
import { t } from '../i18n/index.ts'
import { canShare } from '../platform.ts'
import { CardShell } from './CardShell.tsx'
import { Keycap } from './Keycap.tsx'
import { Stat } from './Stat.tsx'
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
  try {
    await navigator.share({
      title: 'Flappy Hippo',
      text: t.over.shareText(t.points(snapshot.score), t.difficulties[snapshot.difficulty]),
      url: location.href,
    })
  } catch {
    /* the sheet was dismissed, or the platform refused — either way nothing to do */
  }
}

/**
 * The round's result. One number is the hero — this round's score — and everything else is a
 * line underneath it: the record (gold, as on the title card), the melons, the next medal.
 */
export function OverCard({ snapshot, touch, onRestart, onOpenMenu }: OverCardProps) {
  const medal = medalFor(snapshot.score)
  const next = nextMedal(snapshot.score)
  const shareable = canShare() && snapshot.score > 0

  return (
    <CardShell onBackdropTap={onRestart} labelledBy="over-title">
      <h2 id="over-title" className="t-heading">
        {t.over.titles[snapshot.round % t.over.titles.length]}
      </h2>

      {medal && (
        <div
          className="animate-pop mx-auto mt-3 flex h-16 w-16 flex-col items-center justify-center rounded-full border-[3px]"
          style={{
            borderColor: medal.color,
            background: medal.background,
            color: medal.color,
            boxShadow: `0 3px 0 ${medal.shade}`,
          }}
        >
          <IconTrophy width={24} height={24} />
          <span className="t-label mt-0.5 text-[0.75rem]">{t.medals[medal.id]}</span>
        </div>
      )}

      <p className="mt-4">
        <span
          className={`t-number block text-[3.5rem] ${snapshot.newBest ? 'text-gold' : 'text-brand'}`}
        >
          {snapshot.score}
        </span>
        <span className="t-label block">{t.pointsWord(snapshot.score)}</span>
      </p>

      <p className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1">
        <Stat icon={<IconTrophy width={18} height={18} />} tone="gold" animate={snapshot.newBest}>
          {snapshot.newBest ? (
            t.over.newRecord
          ) : (
            <>
              {t.over.record} <span className="t-number">{snapshot.best}</span>
            </>
          )}
        </Stat>
        {snapshot.melons > 0 && (
          <Stat icon={<IconMelon width={18} height={18} />} tone="melon">
            <span className="t-number">{snapshot.melons}</span> {t.melonsWord(snapshot.melons)}
          </Stat>
        )}
      </p>

      {next && (
        <p className="mt-3">
          <Fill
            message={t.over.toNext}
            slots={{
              n: <span className="t-number text-base">{next.from - snapshot.score}</span>,
              medal: t.medals[next.id],
            }}
          />
        </p>
      )}

      <button type="button" className="btn-primary mt-5 w-full" onClick={onRestart}>
        <IconRestart width={22} height={22} />
        {t.over.again}
        {!touch && <Keycap />}
      </button>
      <div className="mt-3 flex justify-center gap-1">
        <button type="button" className="btn-ghost" onClick={() => onOpenMenu('scores')}>
          <IconChart width={20} height={20} />
          {t.over.records}
        </button>
        {shareable && (
          <button type="button" className="btn-ghost" onClick={() => void shareScore(snapshot)}>
            <IconShare width={20} height={20} />
            {t.over.share}
          </button>
        )}
      </div>
    </CardShell>
  )
}
