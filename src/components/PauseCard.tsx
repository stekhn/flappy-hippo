import { CardShell } from './CardShell.tsx'
import { Stat } from './Stat.tsx'
import { IconHome, IconPlay, IconRestart, IconStar } from './icons.tsx'

interface PauseCardProps {
  score: number
  onResume: () => void
  onRestart: () => void
  onGiveUp: () => void
}

export function PauseCard({ score, onResume, onRestart, onGiveUp }: PauseCardProps) {
  return (
    <CardShell onBackdropTap={onResume} labelledBy="pause-title">
      <h2 id="pause-title" className="t-heading">
        Pause
      </h2>
      <p className="mt-2">
        <Stat icon={<IconStar width={18} height={18} />} tone="brand">
          <span className="t-number">{score}</span> {score === 1 ? 'Punkt' : 'Punkte'}
        </Stat>
      </p>

      <button type="button" className="btn-primary mt-5 w-full" onClick={onResume}>
        <IconPlay width={22} height={22} />
        Weiter
      </button>
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn-secondary flex-1 px-3" onClick={onRestart}>
          <IconRestart width={20} height={20} />
          Neu
        </button>
        <button type="button" className="btn-secondary flex-1 px-3" onClick={onGiveUp}>
          <IconHome width={20} height={20} />
          Beenden
        </button>
      </div>
    </CardShell>
  )
}
