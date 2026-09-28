// Small answers about the device, for the one or two places the UI words itself differently.

/** True on devices whose primary input is a finger — only the wording changes. */
export function isTouch(): boolean {
  try {
    return matchMedia('(hover: none)').matches
  } catch {
    return false
  }
}

/** Running from the home screen rather than in a browser tab. */
export function isStandalone(): boolean {
  try {
    if (matchMedia('(display-mode: standalone)').matches) return true
    if (matchMedia('(display-mode: fullscreen)').matches) return true
    return Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  } catch {
    return false
  }
}

/** Safari on iOS never offers an install prompt; there the route is Share → Add to Home Screen. */
export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  // iPadOS asks for the desktop site by default and calls itself a Mac — a Mac with a touchscreen.
  return /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

export function canShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}
