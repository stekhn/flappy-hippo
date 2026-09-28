import { t } from '../i18n/index.ts'
import { CardShell } from './CardShell.tsx'
import { Keycap } from './Keycap.tsx'
import { Stat } from './Stat.tsx'
import { IconHome, IconPlay, IconRestart, IconStar } from './icons.tsx'

interface PauseCardProps {
  score: number
  touch: boolean
  onResume: () => void
  onRestart: () => void
  onGiveUp: () => void
}

export function PauseCard({ score, touch, onResume, onRestart, onGiveUp }: PauseCardProps) {
  return (
    <CardShell onBackdropTap={onResume} labelledBy="pause-title">
      <h2 id="pause-title" className="t-heading">
        {t.pause.title}
      </h2>
      <p className="mt-2">
        <Stat icon={<IconStar width={18} height={18} />} tone="brand">
          <span className="t-number">{score}</span> {t.pointsWord(score)}
        </Stat>
      </p>

      <button type="button" className="btn-primary mt-5 w-full" onClick={onResume}>
        <IconPlay width={22} height={22} />
        {t.pause.resume}
        {!touch && <Keycap />}
      </button>
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn-secondary flex-1 px-3" onClick={onRestart}>
          <IconRestart width={20} height={20} />
          {t.pause.restart}
        </button>
        <button type="button" className="btn-secondary flex-1 px-3" onClick={onGiveUp}>
          <IconHome width={20} height={20} />
          {t.pause.quit}
        </button>
      </div>
    </CardShell>
  )
}
