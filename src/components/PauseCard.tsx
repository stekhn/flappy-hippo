import { CardShell } from './CardShell.tsx'
import { IconHome, IconPlay, IconRestart } from './icons.tsx'

interface PauseCardProps {
  score: number
  onResume: () => void
  onRestart: () => void
  onGiveUp: () => void
}

export function PauseCard({ score, onResume, onRestart, onGiveUp }: PauseCardProps) {
  return (
    <CardShell dim onBackdropTap={onResume} labelledBy="pause-title">
      <h2 id="pause-title" className="text-xl font-black">
        Pause
      </h2>
      <p className="text-muted mt-1 text-sm">
        Aktueller Stand <span className="tnum text-ink font-semibold">{score}</span>
      </p>

      <button type="button" className="btn-primary mt-4 w-full" onClick={onResume}>
        <IconPlay width={20} height={20} />
        Weiter
      </button>
      <div className="mt-2 flex gap-2">
        <button type="button" className="btn-secondary flex-1 text-sm" onClick={onRestart}>
          <IconRestart width={18} height={18} />
          Neu
        </button>
        <button type="button" className="btn-secondary flex-1 text-sm" onClick={onGiveUp}>
          <IconHome width={18} height={18} />
          Beenden
        </button>
      </div>
    </CardShell>
  )
}
