import { medalFor, nextMedal } from '../game/medals.ts'
import type { Snapshot } from '../game/runtime.ts'
import { Fill } from '../i18n/Fill.tsx'
import { t } from '../i18n/index.ts'
import { canShare } from '../platform.ts'
import { CardShell } from './CardShell.tsx'
import { MedalBadge } from './MedalBadge.tsx'
import { Keycap } from './Keycap.tsx'
import { Stat } from './Stat.tsx'
import { IconMelon, IconRestart, IconShare, IconTrophy } from './icons.tsx'

interface OverCardProps {
  snapshot: Snapshot
  touch: boolean
  dark: boolean
  onRestart: () => void
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
export function OverCard({ snapshot, touch, dark, onRestart }: OverCardProps) {
  const medal = medalFor(snapshot.score)
  const next = nextMedal(snapshot.score)
  const shareable = canShare() && snapshot.score > 0
  const toNext = next && (
    <Fill
      message={t.over.toNext}
      slots={{ n: <span className="t-number">{next.from - snapshot.score}</span>, medal: t.medals[next.id] }}
    />
  )

  return (
    <CardShell labelledBy="over-title">
      <h2 id="over-title" className="t-heading">
        {t.over.titles[snapshot.round % t.over.titles.length]}
      </h2>

      <p className="mt-3 flex items-baseline justify-center gap-2">
        <span
          className={`t-number text-[3.5rem] leading-none ${snapshot.newBest ? 'text-gold-ink' : 'text-brand'}`}
        >
          {snapshot.score}
        </span>
        <span className="t-label">{t.pointsWord(snapshot.score)}</span>
      </p>

      {medal ? (
        <div className="tile animate-pop mt-4 flex items-center gap-3 px-3 py-2.5 text-left">
          <MedalBadge medal={medal} size={52} />
          <span className="min-w-0 flex-1" style={{ color: dark ? medal.inkDark : medal.ink }}>
            <span className="t-label block">{t.medals[medal.id]}</span>
            {next && <span className="t-hint block text-current">{toNext}</span>}
          </span>
        </div>
      ) : (
        next && <p className="t-hint mt-4">{toNext}</p>
      )}

      <p className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1">
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

      <div className="mt-4 flex gap-2">
        <button type="button" className="btn-primary flex-1" onClick={onRestart}>
          <IconRestart width={22} height={22} />
          {t.over.again}
          {!touch && <Keycap />}
        </button>
        {shareable && (
          <button
            type="button"
            className="btn-secondary w-14 shrink-0 px-0"
            onClick={() => void shareScore(snapshot)}
            aria-label={t.over.share}
          >
            <IconShare width={20} height={20} />
          </button>
        )}
      </div>
    </CardShell>
  )
}
