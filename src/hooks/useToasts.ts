import { useCallback, useEffect, useState } from 'react'

export interface Toast {
  /** Unique per showing, so the same achievement could in principle toast twice. */
  key: number
  id: string
  leaving: boolean
}

const SHOW_MS = 3400
const LEAVE_MS = 280

let counter = 0

/**
 * A queue of achievement toasts, shown one at a time like a console does it: slide in, hold,
 * slide out, next. Pushing several at once (a crash can unlock two) lines them up.
 */
export function useToasts() {
  const [queue, setQueue] = useState<Toast[]>([])

  const push = useCallback((ids: string[]) => {
    if (ids.length === 0) return
    setQueue((prev) => [...prev, ...ids.map((id) => ({ key: ++counter, id, leaving: false }))])
  }, [])

  const current = queue[0] ?? null

  useEffect(() => {
    if (!current) return
    if (current.leaving) {
      const timer = setTimeout(() => setQueue((prev) => prev.slice(1)), LEAVE_MS)
      return () => clearTimeout(timer)
    }
    const timer = setTimeout(
      () => setQueue((prev) => prev.map((t, i) => (i === 0 ? { ...t, leaving: true } : t))),
      SHOW_MS,
    )
    return () => clearTimeout(timer)
  }, [current])

  return { current, push }
}
