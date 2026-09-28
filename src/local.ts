// Every localStorage access, wrapped. A browser in private mode, or one with site data blocked,
// throws on the first call, and nothing the game saves is essential: on a failure it plays on and
// forgets. Reads return null so each caller can fall back to its own default.

export function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeLocal(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* nothing is saved */
  }
}

export function dropLocal(...keys: string[]): void {
  try {
    for (const key of keys) localStorage.removeItem(key)
  } catch {
    /* nothing was saved */
  }
}
