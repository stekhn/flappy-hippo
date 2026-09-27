import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ACHIEVEMENTS } from '../game/achievements.ts'
import { DIFFICULTIES, difficultyById } from '../game/difficulty.ts'
import type { DifficultyId } from '../game/difficulty.ts'
import type { Progress } from '../game/storage.ts'
import { useMediaQuery } from '../hooks/useMediaQuery.ts'
import { isIos, isStandalone } from '../platform.ts'
import type { Settings } from '../settings.ts'
import { THEME_OPTIONS } from '../theme.ts'
import type { ThemePref } from '../theme.ts'
import { EmojiBadge } from './EmojiBadge.tsx'
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

/**
 * Anything wider than a phone — a phone on its side, a tablet either way, a laptop — gets a dialog
 * with a tab rail. A bottom sheet only makes sense when it can span the whole width.
 */
const WIDE = '(min-width: 640px)'

/**
 * The menu behind the menu button: settings, records, achievements and the how-to. On a narrow
 * phone it is a bottom sheet with a tab bar; on anything wider a centred dialog with the tabs down
 * the left, so a short or square screen still shows a useful amount of content.
 */
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

  // A modal in all but name: focus moves in, Tab stays inside, Escape closes, and whatever had
  // focus before (the menu button, usually) gets it back afterwards.
  useEffect(() => {
    const opener = document.activeElement
    panel.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panel.current) return
      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || active === panel.current)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [onClose])

  const wide = useMediaQuery(WIDE)

  const tabs = TABS.map(({ id, label, icon: Icon }) => (
    <button
      key={id}
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => onTab(id)}
      className={`t-label flex items-center gap-2 rounded-full text-[0.9375rem] transition-[background-color,color,box-shadow] duration-100 ${
        wide ? 'w-full justify-start px-4 py-2.5' : 'flex-1 flex-col gap-0.5 px-1 py-2'
      } ${tab === id ? 'bg-brand text-white shadow-[0_3px_0_var(--game-brand-deep)]' : 'text-muted'}`}
    >
      <Icon width={22} height={22} />
      {label}
    </button>
  ))

  const content = (
    <div
      role="tabpanel"
      aria-label={TABS.find((t) => t.id === tab)?.label}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-1"
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
  )

  const close = (
    <button type="button" className="icon-btn" onClick={onClose} aria-label="Menü schließen">
      <IconClose width={20} height={20} />
    </button>
  )

  return (
    <div
      className={`safe-inset animate-scrim absolute inset-0 z-20 flex justify-center bg-sky/40 ${
        wide ? 'items-center' : 'items-end !p-0'
      }`}
      onPointerDown={onClose}
    >
      {wide ? (
        <div
          ref={panel}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Menü"
          className="glass animate-pop flex max-h-full w-full max-w-[44rem] rounded-[1.75rem] outline-none"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="flex w-44 shrink-0 flex-col p-3">
            <div className="mb-2">{close}</div>
            <div
              role="tablist"
              aria-label="Bereiche"
              aria-orientation="vertical"
              className="flex flex-col gap-1"
            >
              {tabs}
            </div>
          </div>
          <div className="bg-glass-edge my-3 w-0.5 shrink-0" aria-hidden="true" />
          {content}
        </div>
      ) : (
        <div
          ref={panel}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Menü"
          className="glass animate-rise flex max-h-[88dvh] w-full max-w-[30rem] flex-col rounded-t-[1.75rem] border-b-0 outline-none"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {/* Its own row, so the close button never sits on top of the last tab. */}
          <div className="relative flex h-16 shrink-0 items-center justify-center px-2">
            <div className="bg-ink/20 h-1.5 w-12 rounded-full" aria-hidden="true" />
            <div className="absolute right-3">{close}</div>
          </div>
          <div role="tablist" aria-label="Bereiche" className="flex gap-1 px-3 pt-1">
            {tabs}
          </div>
          {content}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="t-section mb-2">{title}</h3>
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
          options={DIFFICULTIES.map((d) => ({ value: d.id, label: d.label }))}
          onChange={(value: DifficultyId) => onSetting('difficulty', value)}
        />
      </Section>

      <Section title="Tag oder Nacht">
        <Segmented label="Design" value={theme} options={THEME_OPTIONS} onChange={onTheme} />
      </Section>

      <Section title="Rückmeldung">
        <div className="space-y-2">
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
        </div>
      </Section>

      {canInstall && (
        <Section title="Installieren">
          <button type="button" className="btn-secondary w-full" onClick={onInstall}>
            <IconInstall width={20} height={20} />
            Zum Startbildschirm
          </button>
          <p className="t-hint mt-2">
            Startet dann bildschirmfüllend, ohne Browserleisten, und läuft auch offline.
          </p>
        </Section>
      )}
      {!canInstall && isIos() && !isStandalone() && (
        <Section title="Installieren">
          <p>
            Auf dem iPhone oder iPad: in Safari das{' '}
            <span className="text-brand font-bold">Teilen</span>-Symbol antippen und{' '}
            <span className="text-brand font-bold">„Zum Home-Bildschirm"</span> wählen. Das Spiel
            startet dann bildschirmfüllend und läuft auch offline.
          </p>
        </Section>
      )}

      <Section title="Daten">
        {confirmReset ? (
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary flex-1 px-3"
              onClick={() => setConfirmReset(false)}
            >
              Abbrechen
            </button>
            <button
              type="button"
              className="btn-primary flex-1 px-3"
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
            className="btn-secondary w-full"
            onClick={() => setConfirmReset(true)}
          >
            Rekorde und Erfolge löschen
          </button>
        )}
        <p className="t-hint mt-2">
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
            <Figure key={difficulty.id} label={difficulty.label} value={best[difficulty.id]} />
          ))}
        </div>
      </Section>

      <Section title="Beste Runden">
        {scores.length === 0 ? (
          <p>Noch keine Runde beendet.</p>
        ) : (
          <ol className="tile divide-tile-edge divide-y-2 px-4">
            {scores.map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="flex items-center gap-3 py-2.5">
                <span className="t-number text-muted w-5 text-right text-base">{index + 1}</span>
                <span className="t-number w-12 text-xl">{entry.score}</span>
                <span className="t-hint flex-1 truncate">
                  {difficultyById(entry.difficulty).label}
                </span>
                <span className="t-hint">{entry.at ? DATE_FORMAT.format(entry.at) : ''}</span>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="Insgesamt">
        <dl className="grid grid-cols-2 gap-2">
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
    <div className="tile px-4 py-3">
      <dt className="t-hint">{label}</dt>
      <dd className="t-number mt-1 text-[1.5rem]">
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
    <Section title={`Erfolge · ${done} von ${ACHIEVEMENTS.length}`}>
      <ul className="space-y-2">
        {ACHIEVEMENTS.map((achievement) => {
          const unlocked = Boolean(progress.achievements[achievement.id])
          return (
            <li
              key={achievement.id}
              className={`tile flex items-center gap-3 px-3 py-2.5 ${unlocked ? '' : 'opacity-55'}`}
            >
              <EmojiBadge icon={achievement.icon} earned={unlocked} />
              <span className="min-w-0 flex-1">
                <span className="t-label block">{achievement.label}</span>
                <span className="block text-[0.9375rem]">{achievement.hint}</span>
              </span>
              {unlocked && <IconCheck width={22} height={22} className="text-gold shrink-0" />}
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
        <ul className="space-y-2.5">
          <li>
            <span className="text-brand font-bold">Tippen oder Leertaste</span> lässt das Nilpferd
            einmal mit den Flügeln schlagen. Gedrückt halten hilft nicht, es fällt trotzdem.
          </li>
          <li>
            <span className="text-brand font-bold">Jedes Hindernis</span> gibt einen Punkt, jede
            Melone drei. Melonen hängen zwischen den Röhren: ein Umweg, der sich lohnen kann.
          </li>
          <li>
            <span className="text-brand font-bold">Die Blase</span> in einer Lücke hält genau einen
            Treffer aus. Danach bleibt das Nilpferd kurz unverwundbar.
          </li>
          <li>
            <span className="text-brand font-bold">Die Decke</span> ist eine Grenze, kein Ende.
            Gefährlich sind nur Boden und Röhren.
          </li>
        </ul>
      </Section>

      <Section title="Tastatur">
        <dl className="space-y-2">
          <Shortcut keys="Leertaste, ↑" action="Fliegen, Runde starten, neue Runde" />
          <Shortcut keys="P, Esc" action="Pause und weiter (mit Countdown)" />
        </dl>
      </Section>

      <Section title="Über das Spiel">
        <p>
          Flappy Hippo läuft komplett im Browser. Einmal geladen, funktioniert es auch offline, und
          alle Rekorde bleiben auf diesem Gerät.
        </p>
        <p className="mt-2">
          <a
            href="https://github.com/stekhn/flappy-hippo"
            target="_blank"
            rel="noopener noreferrer"
            className="t-label text-brand underline-offset-4 hover:underline"
          >
            Quellcode auf GitHub
          </a>
        </p>
      </Section>
    </>
  )
}

function Shortcut({ keys, action }: { keys: string; action: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="tile t-label shrink-0 rounded-full px-2.5 py-0.5 text-[0.9375rem]">{keys}</dt>
      <dd>{action}</dd>
    </div>
  )
}
