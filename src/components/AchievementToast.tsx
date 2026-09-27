import { achievementById } from '../game/achievements.ts'
import type { Toast } from '../hooks/useToasts.ts'
import { IconTrophy } from './icons.tsx'

/** The console-style "Erfolg freigeschaltet" banner, rising from the bottom edge of the board. */
export function AchievementToast({ toast }: { toast: Toast | null }) {
  const achievement = toast ? achievementById(toast.id) : undefined
  if (!toast || !achievement) return null

  return (
    <div
      className="safe-inset pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center"
      role="status"
      aria-live="polite"
    >
      <div
        key={toast.key}
        className={`glass flex w-full max-w-[22rem] items-center gap-3 rounded-2xl py-2.5 pr-4 pl-3 ${
          toast.leaving ? 'animate-toast-out' : 'animate-toast-in'
        }`}
      >
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl"
          style={{
            background: 'color-mix(in srgb, var(--game-gold) 22%, transparent)',
            border: '2px solid var(--game-gold)',
          }}
        >
          {achievement.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-gold block text-[0.8125rem] font-bold tracking-wide">
            Erfolg freigeschaltet
          </span>
          <span className="t-label block truncate">{achievement.label}</span>
        </span>
        <IconTrophy width={22} height={22} className="text-gold shrink-0" />
      </div>
    </div>
  )
}
