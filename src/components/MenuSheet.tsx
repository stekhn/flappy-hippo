import { useEffect, useRef, useState } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import { ACHIEVEMENTS } from '../game/achievements.ts'
import { STAGE_MOVERS, STAGE_POTS, TOP_SCORE } from '../game/constants.ts'
import { DIFFICULTIES } from '../game/difficulty.ts'
import type { DifficultyId } from '../game/difficulty.ts'
import type { Progress } from '../game/storage.ts'
import { useMediaQuery } from '../hooks/useMediaQuery.ts'
import { isIos, isStandalone } from '../platform.ts'
import type { Settings } from '../settings.ts'
import { Fill } from '../i18n/Fill.tsx'
import { formatDate, formatNumber, t } from '../i18n/index.ts'
import { THEME_PREFS } from '../theme.ts'
import type { ThemePref } from '../theme.ts'
import { EmojiBadge } from './EmojiBadge.tsx'
import { blurIfPointer } from './focus.ts'
import { Segmented } from './Segmented.tsx'
import { Toggle } from './Toggle.tsx'
import {
  IconChart,
  IconCheck,
  IconClose,
  IconGear,
  IconHelp,
  IconInstall,
  IconRestart,
  IconStar,
  IconTrash,
} from './icons.tsx'

export type MenuTab = 'settings' | 'scores' | 'awards' | 'help'

const TABS: { id: MenuTab; label: string; icon: typeof IconGear }[] = [
  { id: 'settings', label: t.menu.tabs.settings, icon: IconGear },
  { id: 'scores', label: t.menu.tabs.scores, icon: IconChart },
  { id: 'awards', label: t.menu.tabs.awards, icon: IconStar },
  { id: 'help', label: t.menu.tabs.help, icon: IconHelp },
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
  onRestoreProgress: (snapshot: Progress) => void
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
  onRestoreProgress,
}: MenuSheetProps) {
  const panel = useRef<HTMLDivElement>(null)

  // A modal in all but name: focus moves in, Tab stays inside, Escape closes, and whatever had
  // focus before (the menu button, usually) gets it back afterwards.
  useEffect(() => {
    const opener = document.activeElement
    // Without preventScroll, focusing scrolls every overflow-hidden ancestor as well, board included.
    panel.current?.focus({ preventScroll: true })
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
      title={wide ? undefined : label}
      onClick={() => onTab(id)}
      className={`t-label flex items-center gap-2 rounded-full text-[0.9375rem] transition-[background-color,color,box-shadow] duration-100 ${
        wide ? 'w-full justify-start px-4 py-2.5' : 'h-12 flex-1 justify-center'
      } ${tab === id ? 'bg-brand text-white shadow-[inset_0_-3px_0_var(--game-brand-deep)]' : 'text-muted'}`}
    >
      <Icon width={wide ? 22 : 24} height={wide ? 22 : 24} />
      {wide ? label : <span className="sr-only">{label}</span>}
    </button>
  ))

  // A fresh scroll container per tab: a reused one carries the last tab's offset over, and a
  // shorter list then sits stuck below its end.
  const content = (
    <div
      key={tab}
      role="tabpanel"
      aria-label={TABS.find((t) => t.id === tab)?.label}
      tabIndex={0}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-1 outline-none focus-visible:outline-solid"
    >
      <h2 className="sr-only">{TABS.find((t) => t.id === tab)?.label}</h2>
      {tab === 'settings' && (
        <SettingsTab
          settings={settings}
          theme={theme}
          canInstall={canInstall}
          onSetting={onSetting}
          onTheme={onTheme}
          onInstall={onInstall}
          onResetProgress={onResetProgress}
          onRestoreProgress={onRestoreProgress}
          progress={progress}
        />
      )}
      {tab === 'scores' && <ScoresTab progress={progress} />}
      {tab === 'awards' && <AwardsTab progress={progress} />}
      {tab === 'help' && <HelpTab />}
    </div>
  )

  const close = (
    <button type="button" className="icon-btn" onClick={onClose} aria-label={t.menu.close}>
      <IconClose width={20} height={20} />
    </button>
  )

  // Both layouts are the same dialog; only the shape and where the tabs sit differ.
  const dialog = {
    ref: panel,
    tabIndex: -1,
    role: 'dialog',
    'aria-modal': true,
    'aria-label': t.menu.label,
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => event.stopPropagation(),
  } as const

  return (
    <div
      className={`safe-inset animate-scrim absolute inset-0 z-20 flex justify-center bg-sky/40 ${
        wide ? 'items-center' : 'items-end !p-0'
      }`}
      onPointerDown={onClose}
    >
      {wide ? (
        <div
          {...dialog}
          className="glass animate-pop flex max-h-full w-full max-w-[44rem] rounded-[1.75rem] outline-none"
        >
          <div className="flex w-44 shrink-0 flex-col p-3">
            <div className="mb-2">{close}</div>
            <div
              role="tablist"
              aria-label={t.menu.sections}
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
          {...dialog}
          className="glass animate-rise flex max-h-[88dvh] w-full max-w-[30rem] flex-col rounded-t-[1.75rem] border-b-0 outline-none"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex shrink-0 items-center gap-2 px-3 pt-3 pb-2">
            <div role="tablist" aria-label={t.menu.sections} className="flex min-w-0 flex-1 gap-1">
              {tabs}
            </div>
            {close}
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
  progress,
  canInstall,
  onSetting,
  onTheme,
  onInstall,
  onResetProgress,
  onRestoreProgress,
}: Pick<
  MenuSheetProps,
  | 'settings'
  | 'theme'
  | 'progress'
  | 'canInstall'
  | 'onSetting'
  | 'onTheme'
  | 'onInstall'
  | 'onResetProgress'
  | 'onRestoreProgress'
>) {
  // The delete happens at once; this holds what it removed so it can be put back. The tab panel
  // is keyed by tab and the sheet unmounts on close, so the offer ends exactly there.
  const [undo, setUndo] = useState<Progress | null>(null)

  return (
    <>
      <Section title={t.menu.settings.difficulty}>
        <Segmented
          label={t.menu.settings.difficulty}
          value={settings.difficulty}
          options={DIFFICULTIES.map((d) => ({ value: d.id, label: t.difficulties[d.id] }))}
          onChange={(value: DifficultyId) => onSetting('difficulty', value)}
        />
      </Section>

      <Section title={t.menu.settings.theme}>
        <Segmented
          label={t.menu.settings.themeLabel}
          value={theme}
          options={THEME_PREFS.map((value) => ({ value, label: t.themes[value] }))}
          onChange={onTheme}
        />
      </Section>

      <Section title={t.menu.settings.feedback}>
        <div className="space-y-2">
          <Toggle
            label={t.menu.settings.sound}
            hint={t.menu.settings.soundHint}
            checked={settings.sound}
            onChange={(value) => onSetting('sound', value)}
          />
          <Toggle
            label={t.menu.settings.vibration}
            hint={t.menu.settings.vibrationHint}
            checked={settings.haptics}
            onChange={(value) => onSetting('haptics', value)}
          />
        </div>
      </Section>

      {canInstall && (
        <Section title={t.menu.settings.install}>
          <button type="button" className="btn-secondary w-full" onClick={onInstall}>
            <IconInstall width={20} height={20} />
            {t.menu.settings.installButton}
          </button>
          <p className="t-hint mt-2">{t.menu.settings.installHint}</p>
        </Section>
      )}
      {!canInstall && isIos() && !isStandalone() && (
        <Section title={t.menu.settings.install}>
          <p>
            <Fill
              message={t.menu.settings.installIos}
              slots={{
                share: <span className="font-bold">{t.menu.settings.installIosShare}</span>,
                add: <span className="font-bold">{t.menu.settings.installIosAdd}</span>,
              }}
            />
          </p>
        </Section>
      )}

      <Section title={t.menu.settings.data}>
        <div className="tile flex w-full items-center justify-between gap-4 px-4 py-3">
          <span className="min-w-0">
            <span className="t-label block">{t.menu.settings.dataTitle}</span>
            <span className="t-hint block">
              {undo ? t.menu.settings.deleted : t.menu.settings.dataHint}
            </span>
          </span>
          {undo ? (
            <button
              type="button"
              onClick={(event) => {
                blurIfPointer(event)
                onRestoreProgress(undo)
                setUndo(null)
              }}
              className="t-label text-ink border-tile-edge flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3 py-2"
            >
              <IconRestart width={18} height={18} />
              {t.menu.settings.undo}
            </button>
          ) : (
            <button
              type="button"
              aria-label={t.menu.settings.dataTitle}
              onClick={(event) => {
                blurIfPointer(event)
                setUndo(progress)
                onResetProgress()
              }}
              className="text-ink/70 hover:text-ink border-tile-edge flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
            >
              <IconTrash width={21} height={21} />
            </button>
          )}
        </div>
      </Section>
    </>
  )
}

function ScoresTab({ progress }: { progress: Progress }) {
  const { stats, scores, best } = progress

  return (
    <>
      <Section title={t.menu.scores.records}>
        <dl className="grid grid-cols-3 gap-2">
          {DIFFICULTIES.map((difficulty) => (
            <Figure key={difficulty.id} label={t.difficulties[difficulty.id]} value={best[difficulty.id]} />
          ))}
        </dl>
      </Section>

      <Section title={t.menu.scores.bestRounds}>
        {scores.length === 0 ? (
          <p>{t.menu.scores.noRounds}</p>
        ) : (
          <ol className="tile divide-tile-edge divide-y-2 px-4">
            {scores.map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="flex items-center gap-3 py-2.5">
                <span className="t-number text-muted w-5 text-right text-base">{index + 1}</span>
                <span className="t-number w-12 text-xl">{entry.score}</span>
                <span className="t-hint flex-1 truncate">
                  {t.difficulties[entry.difficulty]}
                </span>
                <span className="t-hint">{entry.at ? formatDate(entry.at) : ''}</span>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title={t.menu.scores.total}>
        <dl className="grid grid-cols-2 gap-2">
          <Figure label={t.menu.scores.rounds} value={stats.games} />
          <Figure label={t.menu.scores.points} value={stats.points} />
          <Figure label={t.menu.scores.obstacles} value={stats.pipes} />
          <Figure label={t.menu.scores.melons} value={stats.melons} />
          <Figure label={t.menu.scores.shields} value={stats.shields} />
          <Figure label={t.menu.scores.flightTime} value={formatDuration(stats.seconds)} />
          <Figure label={t.menu.scores.pots} value={stats.pots} />
          <Figure label={t.menu.scores.movers} value={stats.movers} />
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
        {typeof value === 'number' ? formatNumber(value) : value}
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
  return (
    <section className="mb-6">
      <ul className="space-y-2">
        {ACHIEVEMENTS.map((achievement) => {
          const unlocked = Boolean(progress.achievements[achievement.id])
          // The later ones stay secret until the player is close, and say what brings them out.
          const secret = !unlocked && achievement.reveal !== undefined && !achievement.reveal.when(progress)
          const words = t.achievements[achievement.id]
          const reveal = achievement.reveal
          const revealHint = reveal?.hint ? t.reveal[reveal.hint.kind](reveal.hint.at) : t.reveal.secret
          return (
            <li
              key={achievement.id}
              className={`tile flex items-center gap-3 px-3 py-2.5 ${unlocked ? '' : 'opacity-55'}`}
            >
              <EmojiBadge icon={secret ? '🔒' : achievement.icon} earned={unlocked} />
              <span className="min-w-0 flex-1">
                <span className="t-label block">{secret ? t.menu.awards.hidden : words.label}</span>
                <span className="block text-[0.9375rem]">{secret ? revealHint : words.hint}</span>
              </span>
              {unlocked && <IconCheck width={22} height={22} className="text-gold-ink shrink-0" />}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function HelpTab() {
  const rules = [...t.menu.help.rules, t.menu.help.stages(STAGE_MOVERS, STAGE_POTS), t.menu.help.top(TOP_SCORE)]
  return (
    <>
      <Section title={t.menu.help.howToPlay}>
        <ul className="space-y-2.5">
          {rules.map((rule) => (
            <li key={rule.lead}>
              <span className="font-bold">{rule.lead}</span> {rule.rest}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t.menu.help.keyboard}>
        <dl className="space-y-2">
          {t.menu.help.shortcuts.map((shortcut) => (
            <Shortcut key={shortcut.keys} keys={shortcut.keys} action={shortcut.action} />
          ))}
        </dl>
      </Section>

      <Section title={t.menu.help.about}>
        <p>{t.menu.help.aboutText}</p>
        <p className="mt-2">
          <a
            href="https://github.com/stekhn/flappy-hippo"
            target="_blank"
            rel="noopener noreferrer"
            className="t-label text-brand underline-offset-4 hover:underline"
          >
            {t.menu.help.source}
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
