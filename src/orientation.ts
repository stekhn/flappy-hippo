// Playing in landscape, as far as the web allows. An installed app gets it from the manifest's
// orientation. A tab on Android can lock the screen, but only once it is fullscreen. Safari on iOS
// supports neither, so there the view itself is turned with a transform (see styles.css), which is
// what mobile games have always fallen back to.

import { readLocal, writeLocal } from './local.ts'

const ROTATE_KEY = 'flappy-hippo.rotate'

type Lockable = ScreenOrientation & { lock?: (orientation: string) => Promise<void> }

function lockable(): Lockable | null {
  if (typeof screen === 'undefined') return null
  const orientation = screen.orientation as Lockable | undefined
  return typeof orientation?.lock === 'function' ? orientation : null
}

/**
 * Turns the screen itself, which needs fullscreen first. Answers whether it worked, so a browser
 * that refuses can fall back to turning the view.
 */
export async function lockLandscape(): Promise<boolean> {
  const orientation = lockable()
  if (!orientation) return false
  const wasFullscreen = Boolean(document.fullscreenElement)
  try {
    if (!wasFullscreen) await document.documentElement.requestFullscreen()
    await orientation.lock('landscape')
    return true
  } catch {
    // Fullscreen was only a means to the lock; without it there is no reason to stay.
    if (!wasFullscreen && document.fullscreenElement) await document.exitFullscreen().catch(() => {})
    return false
  }
}

export function readRotated(): boolean {
  return readLocal(ROTATE_KEY) === '1'
}

export function writeRotated(rotated: boolean): void {
  writeLocal(ROTATE_KEY, rotated ? '1' : '0')
}
