import type { DifficultyId } from './game/difficulty.ts'
import { readLocal, writeLocal } from './local.ts'

/** Everything in the settings sheet except the theme, which lives in theme.ts. */
export interface Settings {
  difficulty: DifficultyId
  sound: boolean
  haptics: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  difficulty: 'normal',
  sound: true,
  haptics: true,
}

const STORAGE_KEY = 'flappy-hippo.settings'

export function loadSettings(): Settings {
  const raw = readLocal(STORAGE_KEY)
  if (!raw) return { ...DEFAULT_SETTINGS }
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>
    return {
      difficulty:
        parsed.difficulty === 'easy' || parsed.difficulty === 'hard'
          ? parsed.difficulty
          : 'normal',
      sound: parsed.sound !== false,
      haptics: parsed.haptics !== false,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function persistSettings(settings: Settings): void {
  writeLocal(STORAGE_KEY, JSON.stringify(settings))
}
