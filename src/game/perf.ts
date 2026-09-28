// Frame monitor: logs every long frame with what the game did in it, a summary every few
// seconds, and (Chrome) long animation frames with the scripts that filled them. On with
// `?perf` in the URL.

export interface FrameNote {
  phase: string
  score: number
  /** What the layer cache baked during this frame, if anything. */
  bakes: string[]
  /** The pixel ratio the canvas is at. */
  dpr: number
}

/** A dropped frame at 60 Hz. */
const LONG_FRAME_MS = 25
const SUMMARY_MS = 5000
const TAG = '[perf]'

interface LoafScript {
  duration: number
  invoker?: string
  sourceFunctionName?: string
  sourceURL?: string
  sourceCharPosition?: number
}

interface LoafEntry extends PerformanceEntry {
  blockingDuration?: number
  renderStart?: number
  styleAndLayoutStart?: number
  scripts?: LoafScript[]
}

// Read at load: the app strips the query string once it has booted.
const FLAGGED = (() => {
  try {
    return new URLSearchParams(location.search).has('perf')
  } catch {
    return false
  }
})()

export function perfEnabled(): boolean {
  return FLAGGED
}

export class FrameMonitor {
  private gaps: number[] = []
  private works: number[] = []
  private longFrames = 0
  private windowStart = 0
  private observers: PerformanceObserver[] = []
  /** A long gap is the previous frame's doing, not the one that notices it. */
  private previous: { work: number; ui: number; note: FrameNote } | null = null

  constructor() {
    this.observe('long-animation-frame', (entry) => {
      const loaf = entry as LoafEntry
      if (loaf.duration < LONG_FRAME_MS) return
      const render = loaf.renderStart ? (loaf.startTime + loaf.duration - loaf.renderStart).toFixed(0) : '?'
      const scripts = (loaf.scripts ?? [])
        .filter((s) => s.duration >= 4)
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 3)
        .map((s) => {
          const where = s.sourceURL ? `${s.sourceURL.replace(/^.*\/(src\/)/, '$1').split('?')[0]}:${s.sourceCharPosition ?? ''}` : ''
          return `${s.duration.toFixed(0)} ms ${s.sourceFunctionName || s.invoker || 'script'} ${where}`.trim()
        })
      console.warn(
        `${TAG} long animation frame ${loaf.duration.toFixed(0)} ms (blocking ${(loaf.blockingDuration ?? 0).toFixed(0)} ms, style/layout/paint ${render} ms)` +
          (scripts.length > 0 ? `: ${scripts.join('; ')}` : ': no script over 4 ms — the time went to style, layout, paint or the compositor'),
      )
    })
    this.observe('longtask', (entry) => {
      console.warn(`${TAG} long task ${entry.duration.toFixed(0)} ms on the main thread`)
    })
  }

  private observe(type: string, report: (entry: PerformanceEntry) => void): void {
    try {
      const observer = new PerformanceObserver((list) => list.getEntries().forEach(report))
      observer.observe({ type, buffered: false })
      this.observers.push(observer)
    } catch {
      /* not every browser has this entry type */
    }
  }

  event(text: string): void {
    console.info(`${TAG} ${text}`)
  }

  /** One painted frame: the gap since the last, the game's work, the snapshot's time, and context. */
  frame(now: number, gapMs: number, workMs: number, uiMs: number, note: FrameNote): void {
    if (this.windowStart === 0) this.windowStart = now
    this.gaps.push(gapMs)
    this.works.push(workMs)
    if (gapMs > LONG_FRAME_MS) {
      this.longFrames += 1
      const culprit = this.previous ?? { work: workMs, ui: uiMs, note }
      const where =
        culprit.note.bakes.length > 0
          ? `baked ${culprit.note.bakes.join(', ')}`
          : culprit.work + culprit.ui > gapMs * 0.6
            ? "the game's own work"
            : 'outside the game loop (style, layout, paint, GC, React, extensions)'
      console.warn(
        `${TAG} long frame ${gapMs.toFixed(1)} ms: work ${culprit.work.toFixed(1)} ms, ui ${culprit.ui.toFixed(1)} ms, ${where}; ${culprit.note.phase}, score ${culprit.note.score}, ${culprit.note.dpr}x`,
      )
    }
    this.previous = { work: workMs, ui: uiMs, note }
    if (now - this.windowStart < SUMMARY_MS) return
    const sorted = [...this.gaps].sort((a, b) => a - b)
    const n = sorted.length
    const mean = this.gaps.reduce((a, b) => a + b, 0) / n
    const p95 = sorted[Math.floor(n * 0.95)]
    const worst = sorted[n - 1]
    const median = sorted[Math.floor(n / 2)]
    // Judder without a dropped frame: frames straying from the median gap.
    const jitter = this.gaps.reduce((a, b) => a + Math.abs(b - median), 0) / n
    const work = this.works.reduce((a, b) => a + b, 0) / n
    const workMax = Math.max(...this.works)
    console.info(
      `${TAG} last ${((now - this.windowStart) / 1000).toFixed(0)} s: ${n} frames, ${(1000 / mean).toFixed(1)} fps, p95 ${p95.toFixed(1)} ms, worst ${worst.toFixed(1)} ms, ${this.longFrames} long, jitter ${jitter.toFixed(2)} ms; work avg ${work.toFixed(2)} ms, max ${workMax.toFixed(1)} ms`,
    )
    this.gaps.length = 0
    this.works.length = 0
    this.longFrames = 0
    this.windowStart = now
  }

  dispose(): void {
    for (const observer of this.observers) observer.disconnect()
    this.observers.length = 0
  }
}
