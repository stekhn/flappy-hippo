import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ACHIEVEMENTS } from '../game/achievements.ts'
import { DIFFICULTIES, difficultyById } from '../game/difficulty.ts'
import type { DifficultyId } from '../game/difficulty.ts'
import type { Progress } from '../game/storage.ts'
import type { Settings } from '../settings.ts'
import { THEME_OPTIONS } from '../theme.ts'
import type { ThemePref } from '../theme.ts'
import { Segmented } from './Segmented.tsx'
import { Toggle } from './Toggle.tsx'
import { IconChart, IconCheck, IconClose, IconGear, IconHelp, IconInstall, IconStar } from './icons.tsx'

export type MenuTab = 'settings' | 'scores' | 'awards' | 'help'

const TABS: { id: MenuTab; label: string; icon: typeof IconGear }[] = [
  { id: 'settings', label: 'Spiel', icon: IconGear },
  { id: 'scores', label: 'Rekorde', icon: IconChart },
  { id: 'awards', label: 'Erfolge', icon: IconStar },
  { id: 'help', label: 'Info', icon: IconHelp },
]

interface MenuSheetProps {
  tab: MenuTab
  settings: Settings
  theme: ThemePref
  progress: Progress
  /** Present only when the browser offered an install prompt we stashed. */
  canInstall: boolean
  onTab: (tab: MenuTab) => void
  onClose: () => void
  onSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  onTheme: (theme: ThemePref) => void
  onInstall: () => void
  onResetProgress: () => void
}

/** The bottom sheet behind the menu button: settings, records, achievements and the how-to. */
export function MenuSheet({
  tab,
  settings,
  theme,
  progress,
  canInstall,
  onTab,
  onClose,
  onSetting,
  onTheme,
  onInstall,
  onResetProgress,
}: MenuSheetProps) {
  const panel = useRef<HTMLDivElement>(null)

  // Escape closes, and focus moves into the sheet so a keyboard can reach the tabs.
  useEffect(() => {
    panel.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onClose])

  return (
    <div
      className="animate-fade absolute inset-0 z-20 flex items-end justify-center bg-black/35"
      onPointerDown={onClose}
    >
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Menü"
        className="sheet animate-rise flex max-h-[88dvh] w-full max-w-[30rem] flex-col rounded-b-none outline-none"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="relative px-4 pt-3">
          <div className="bg-line mx-auto h-1 w-10 rounded-full" aria-hidden="true" />
          <button
            type="button"
            className="icon-btn absolute top-1 right-2 h-10 w-10 border-0 bg-transparent"
            onClick={onClose}
            aria-label="Menü schließen"
          >
            <IconClose width={20} height={20} />
          </button>
        </div>

        <div role="tablist" aria-label="Bereiche" className="flex gap-1 px-3 pt-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => onTab(id)}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-xs font-semibold transition-colors ${
                tab === id ? 'text-brand bg-brand/10' : 'text-muted'
              }`}
            >
              <Icon width={20} height={20} />
              {label}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          aria-label={TABS.find((t) => t.id === tab)?.label}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-1"
        >
          {tab === 'settings' && (
            <SettingsTab
              settings={settings}
              theme={theme}
              canInstall={canInstall}
              onSetting={onSetting}
              onTheme={onTheme}
              onInstall={onInstall}
              onResetProgress={onResetProgress}
            />
          )}
          {tab === 'scores' && <ScoresTab progress={progress} />}
          {tab === 'awards' && <AwardsTab progress={progress} />}
          {tab === 'help' && <HelpTab />}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="text-muted mb-2 text-xs font-bold tracking-wide uppercase">{title}</h3>
      {children}
    </section>
  )
}

function SettingsTab({
  settings,
  theme,
  canInstall,
  onSetting,
  onTheme,
  onInstall,
  onResetProgress,
}: Pick<
  MenuSheetProps,
  'settings' | 'theme' | 'canInstall' | 'onSetting' | 'onTheme' | 'onInstall' | 'onResetProgress'
>) {
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <>
      <Section title="Schwierigkeit">
        <Segmented
          label="Schwierigkeit"
          value={settings.difficulty}
          options={DIFFICULTIES.map((d) => ({ value: d.id, label: d.label, hint: d.hint }))}
          onChange={(value: DifficultyId) => onSetting('difficulty', value)}
        />
        <p className="text-muted mt-1.5 text-xs">{difficultyById(settings.difficulty).hint}</p>
      </Section>

      <Section title="Darstellung">
        <Segmented label="Design" value={theme} options={THEME_OPTIONS} onChange={onTheme} />
      </Section>

      <Section title="Rückmeldung">
        <Toggle
          label="Ton"
          hint="Flügelschlag, Punkte, Bruchlandung"
          checked={settings.sound}
          onChange={(value) => onSetting('sound', value)}
        />
        <Toggle
          label="Vibration"
          hint="Kurzes Feedback auf unterstützten Geräten"
          checked={settings.haptics}
          onChange={(value) => onSetting('haptics', value)}
        />
      </Section>

      {canInstall && (
        <Section title="Installieren">
          <button type="button" className="btn-secondary w-full text-sm" onClick={onInstall}>
            <IconInstall width={18} height={18} />
            Zum Startbildschirm hinzufügen
          </button>
        </Section>
      )}

      <Section title="Daten">
        {confirmReset ? (
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary flex-1 text-sm"
              onClick={() => setConfirmReset(false)}
            >
              Abbrechen
            </button>
            <button
              type="button"
              className="btn-primary flex-1 text-sm"
              onClick={() => {
                onResetProgress()
                setConfirmReset(false)
              }}
            >
              Wirklich löschen
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn-secondary w-full text-sm"
            onClick={() => setConfirmReset(true)}
          >
            Rekorde und Erfolge löschen
          </button>
        )}
        <p className="text-muted mt-2 text-xs">
          Alles bleibt auf diesem Gerät. Es gibt kein Konto, keine Server und keine Werbung.
        </p>
      </Section>
    </>
  )
}

const DATE_FORMAT = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' })

function ScoresTab({ progress }: { progress: Progress }) {
  const { stats, scores, best } = progress

  return (
    <>
      <Section title="Rekorde">
        <div className="grid grid-cols-3 gap-2">
          {DIFFICULTIES.map((difficulty) => (
            <div key={difficulty.id} className="border-line bg-surface rounded-xl border px-3 py-2">
              <div className="text-muted text-xs">{difficulty.label}</div>
              <div className="tnum text-xl font-bold">{best[difficulty.id]}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Beste Runden">
        {scores.length === 0 ? (
          <p className="text-muted text-sm">Noch keine Runde beendet.</p>
        ) : (
          <ol className="divide-line divide-y">
            {scores.map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="flex items-center gap-3 py-2 text-sm">
                <span className="text-muted tnum w-5 text-right">{index + 1}</span>
                <span className="tnum w-10 font-bold">{entry.score}</span>
                <span className="text-muted flex-1 truncate">
                  {difficultyById(entry.difficulty).label}
                </span>
                <span className="text-muted tnum text-xs">
                  {entry.at ? DATE_FORMAT.format(entry.at) : ''}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="Insgesamt">
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <Figure label="Runden" value={stats.games} />
          <Figure label="Punkte" value={stats.points} />
          <Figure label="Hindernisse" value={stats.pipes} />
          <Figure label="Melonen" value={stats.melons} />
          <Figure label="Schilde" value={stats.shields} />
          <Figure label="Flugzeit" value={formatDuration(stats.seconds)} />
        </dl>
      </Section>
    </>
  )
}

function Figure({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border-line bg-surface rounded-xl border px-3 py-2">
      <dt className="text-muted text-xs">{label}</dt>
      <dd className="tnum text-lg font-bold">
        {typeof value === 'number' ? value.toLocaleString('de-DE') : value}
      </dd>
    </div>
  )
}

function formatDuration(seconds: number): string {
  const total = Math.floor(seconds)
  const minutes = Math.floor(total / 60)
  if (minutes < 60) return `${minutes}:${String(total % 60).padStart(2, '0')} min`
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

function AwardsTab({ progress }: { progress: Progress }) {
  const done = ACHIEVEMENTS.filter((a) => progress.achievements[a.id]).length

  return (
    <Section title={`Erfolge ${done} von ${ACHIEVEMENTS.length}`}>
      <ul className="space-y-1.5">
        {ACHIEVEMENTS.map((achievement) => {
          const unlocked = Boolean(progress.achievements[achievement.id])
          return (
            <li
              key={achievement.id}
              className={`border-line flex items-center gap-3 rounded-xl border px-3 py-2 ${
                unlocked ? 'bg-surface' : 'opacity-55'
              }`}
            >
              <span aria-hidden="true" className="text-xl">
                {achievement.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{achievement.label}</span>
                <span className="text-muted block text-xs">{achievement.hint}</span>
              </span>
              {unlocked && <IconCheck width={18} height={18} className="text-brand shrink-0" />}
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

function HelpTab() {
  return (
    <>
      <Section title="So wird gespielt">
        <ul className="text-muted space-y-2 text-sm">
          <li>
            <span className="text-ink font-semibold">Tippen oder Leertaste</span> lässt das Nilpferd
            einmal mit den Flügeln schlagen. Nicht gedrückt halten — es fällt sonst trotzdem.
          </li>
          <li>
            <span className="text-ink font-semibold">Jedes Hindernis</span> gibt einen Punkt, jede
            Melone drei. Melonen hängen zwischen den Röhren: ein Umweg, der sich lohnen kann.
          </li>
          <li>
            <span className="text-ink font-semibold">Die Blase</span> in einer Lücke hält genau
            einen Treffer aus. Danach bleibt das Nilpferd kurz unverwundbar.
          </li>
          <li>
            <span className="text-ink font-semibold">Die Decke</span> ist eine Grenze, kein Ende —
            nur Boden und Röhren sind gefährlich.
          </li>
        </ul>
      </Section>

      <Section title="Tastatur">
        <dl className="text-muted space-y-1.5 text-sm">
          <Shortcut keys="Leertaste, ↑" action="Fliegen, Runde starten, neue Runde" />
          <Shortcut keys="P, Esc" action="Pause und weiter" />
        </dl>
      </Section>

      <Section title="Über das Spiel">
        <p className="text-muted text-sm">
          Flappy Hippo läuft komplett im Browser. Einmal geladen, funktioniert es auch offline, und
          alle Rekorde bleiben auf diesem Gerät.
        </p>
      </Section>
    </>
  )
}

function Shortcut({ keys, action }: { keys: string; action: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="border-line bg-surface shrink-0 rounded-md border px-2 py-0.5 font-mono text-xs">
        {keys}
      </dt>
      <dd>{action}</dd>
    </div>
  )
}
