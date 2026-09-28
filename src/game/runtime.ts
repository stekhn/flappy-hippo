import { readLocal, writeLocal } from '../local.ts'
import { createSfx } from './audio.ts'
import type { Sfx } from './audio.ts'
import { COUNTDOWN_MS, HIPPO_RADIUS, MAX_FRAME_S, OVER_SETTLE_MS, RESTART_DELAY_MS } from './constants.ts'

import { difficultyById } from './difficulty.ts'
import type { Difficulty, DifficultyId } from './difficulty.ts'
import { resolvePalette } from './palette.ts'
import { LayerCache } from './render/layers.ts'
import { FrameMonitor, perfEnabled } from './perf.ts'
import { drawScene, warmUp } from './render/scene.ts'
import { furnitureUnder } from './render/street.ts'
import { animateSky, initialSky } from './render/scenery.ts'
import type { SkyMotion } from './render/scenery.ts'
import { advance, flap, gameOver, initialState } from './state.ts'
import type { Furniture, GameEvent, GameState, Palette, RunSummary } from './types.ts'
import { canvasSize, fitWorld } from './world.ts'
import type { World } from './world.ts'

/** What the React layer needs to render the HUD and the cards. Pushed only when it changes. */
export interface Snapshot {
  phase: GameState['phase']
  paused: boolean
  /** 3, 2, 1 while a resumed round counts back in; 0 otherwise. */
  countdown: number
  score: number
  best: number
  newBest: boolean
  /** Shield charges in hand. */
  charges: number
  melons: number
  round: number
  /** The difficulty this round runs on — what the share text and the over card should name. */
  difficulty: DifficultyId
  /** The stage the round has reached: 0, 1 with the moving pipes, 2 with the pots. */
  stage: number
}

export interface RuntimeOptions {
  canvas: HTMLCanvasElement
  /** The element the board is fitted into — the canvas' own box shrinks to the board. */
  box: HTMLElement
  difficulty: DifficultyId
  best: number
  dark: boolean
  sound: boolean
  haptics: boolean
  onSnapshot: (snapshot: Snapshot) => void
  onEvent: (event: GameEvent) => void
}

/** How long a run of resizes must be quiet before the canvas is refitted. */
const RESIZE_SETTLE_MS = 120

/**
 * Quality governor. Fill rate is the cost that scales with the device, and a browser without an
 * accelerated canvas (Firefox on Android) pays it on the CPU: while most frames run long, the
 * pixel-ratio cap steps down, and at its floor the frosted blur goes too. The finding is kept
 * on the device for a week.
 */
const DPR_CAP = 2
const DPR_FLOOR = 1
/** A frame longer than this missed 60 fps. */
const SLOW_FRAME_S = 0.019
/**
 * A long frame counts only when the frame's own work took at least this long: a browser saving
 * battery paces frames at 30 fps with the work small, and is not a slow device.
 */
const BUSY_S = 0.008
/** A gap longer than this is a stall, not a slow device. */
const STALL_S = 0.25
/** Frames are judged a second at a time; this share of long ones steps the quality down. */
const JUDGE_S = 1
const JUDGE_SHARE = 2 / 3
/** Frames after a refit that go unjudged: the rebake costs one. */
const SETTLE_FRAMES = 10
const QUALITY_KEY = 'flappy-hippo.quality'
const QUALITY_TTL_MS = 7 * 24 * 3600 * 1000

interface Quality {
  dpr: number
  lite: boolean
  at: number
}

function loadQuality(): Quality {
  const raw = readLocal(QUALITY_KEY)
  try {
    const saved = JSON.parse(raw ?? 'null') as Partial<Quality> | null
    const at = saved?.at
    if (typeof at === 'number' && Date.now() - at < QUALITY_TTL_MS) {
      const dpr = saved?.dpr
      if (typeof dpr === 'number' && dpr >= DPR_FLOOR && dpr <= DPR_CAP) {
        return { dpr, lite: saved?.lite === true, at }
      }
    }
  } catch {
    /* an unreadable value */
  }
  return { dpr: DPR_CAP, lite: false, at: 0 }
}

function saveQuality(quality: Omit<Quality, 'at'>): void {
  writeLocal(QUALITY_KEY, JSON.stringify({ ...quality, at: Date.now() }))
}

/** styles.css drops the backdrop blur under this flag. */
function applyLite(on: boolean): void {
  if (on) document.documentElement.dataset.lite = 'true'
  else delete document.documentElement.dataset.lite
}

function buzz(enabled: boolean, pattern: number | number[]): void {
  if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) return
  try {
    navigator.vibrate(pattern)
  } catch {
    /* some browsers throw when the page is not visible */
  }
}

function prefersReducedMotion(): boolean {
  try {
    return matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/**
 * Owns the canvas, the animation frame and the input plumbing; the simulation itself stays in
 * state.ts and the drawing in render/. React talks to it through the methods below and listens
 * through `onSnapshot` / `onEvent`, so the game loop never triggers a re-render per frame.
 */
export class GameRuntime {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly options: RuntimeOptions
  private readonly sfx: Sfx
  private readonly effects = !prefersReducedMotion()

  private world: World
  private palette: Palette
  private difficulty: Difficulty
  private state: GameState
  private sky: SkyMotion = initialSky()
  /** Baked backdrop strips; see render/layers.ts. */
  private readonly cache = new LayerCache()
  /** World units to device pixels, for baking at full resolution. */
  private scale = 1
  private dprCap = DPR_CAP
  private lite = false
  private readonly monitor = perfEnabled() ? new FrameMonitor() : null
  /** Whether the previous frame was painted live, so this one's gap says something. */
  private wasLive = false
  private fontsIn = false
  private judgedS = 0
  private judged = 0
  private slowFrames = 0
  private settle = SETTLE_FRAMES
  private events: GameEvent[] = []
  private frame = 0
  private last = 0
  private paused = false
  /** While the menu sheet is up nothing moves and nothing is painted, whatever the phase. */
  private suspended = false
  /** A still frame with no card over it, for taking screenshots. Shift+P. */
  private frozen = false
  /** performance.now() until which a resumed round is still counting back in. */
  private countdownUntil = 0
  /** A difficulty picked mid-round, applied when the next one starts. */
  private pending: Difficulty | null = null
  /** Something changed while the scene was still (theme, size, pause) — paint one more frame. */
  private dirty = true
  private haptics: boolean
  private snapshot: Snapshot
  private observer: ResizeObserver | null = null
  private resizeTimer = 0
  /** What the round ended on, if the hippo came down on a piece of street furniture. */
  private hit: Furniture | null = null
  /** The box and pixel ratio the canvas was last fitted to. */
  private fitted = { width: 0, height: 0, dpr: 0 }

  /** Switching apps, tabs or windows must not cost the round. */
  private readonly onHidden = () => {
    if (document.hidden) this.leave()
  }
  private readonly onBlur = () => this.leave()
  /**
   * Browsers only let audio start from an activating gesture: a finger lifting or a key going
   * down count, a touch beginning does not. Unlocking here means the very first flap is heard.
   */
  private readonly onActivate = () => this.sfx.unlock()

  constructor(options: RuntimeOptions) {
    const ctx = options.canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D is not available')
    this.canvas = options.canvas
    this.ctx = ctx
    this.options = options
    const quality = loadQuality()
    this.dprCap = quality.dpr
    this.lite = quality.lite
    applyLite(this.lite)
    this.monitor?.event(`on; quality ${quality.dpr}x${quality.lite ? ', lite' : ''}; ${navigator.userAgent}`)
    this.haptics = options.haptics
    this.sfx = createSfx(!options.sound)
    this.sfx.warm()
    this.difficulty = difficultyById(options.difficulty)
    this.palette = resolvePalette(options.dark)
    this.world = fitWorld(options.box.clientWidth, options.box.clientHeight)
    this.state = initialState({ world: this.world, difficulty: this.difficulty, best: options.best })
    this.snapshot = this.readSnapshot()
  }

  start(): void {
    this.measure()
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(() => {
        this.fontsIn = true
        this.dirty = true
      })
    }
    // A phone's address bar slides away over a dozen frames, each one a resize: refit once it settles.
    this.observer = new ResizeObserver(() => {
      clearTimeout(this.resizeTimer)
      this.resizeTimer = window.setTimeout(() => this.measure(), RESIZE_SETTLE_MS)
    })
    this.observer.observe(this.options.box)
    document.addEventListener('visibilitychange', this.onHidden)
    window.addEventListener('blur', this.onBlur)
    this.options.box.addEventListener('pointerup', this.onActivate)
    window.addEventListener('keydown', this.onActivate)
    this.last = performance.now()
    const loop = (now: number) => {
      this.step(now)
      this.frame = requestAnimationFrame(loop)
    }
    this.frame = requestAnimationFrame(loop)
  }

  destroy(): void {
    cancelAnimationFrame(this.frame)
    clearTimeout(this.resizeTimer)
    document.removeEventListener('visibilitychange', this.onHidden)
    window.removeEventListener('blur', this.onBlur)
    this.options.box.removeEventListener('pointerup', this.onActivate)
    window.removeEventListener('keydown', this.onActivate)
    this.observer?.disconnect()
    this.observer = null
    this.sfx.dispose()
    this.monitor?.dispose()
  }

  /** Re-fits the play field to the box and rebuilds the backing store at device resolution. */
  measure(): void {
    const { clientWidth: width, clientHeight: height } = this.options.box
    if (width < 1 || height < 1) return
    const dpr = Math.min(window.devicePixelRatio || 1, this.dprCap)
    // Setting a canvas' size clears it and costs a fresh backing store: only for a real change.
    if (width === this.fitted.width && height === this.fitted.height && dpr === this.fitted.dpr) return
    this.fitted = { width, height, dpr }
    const next = fitWorld(width, height)
    const size = canvasSize(next, width, height)
    this.canvas.style.width = `${size.width}px`
    this.canvas.style.height = `${size.height}px`
    // Short of filling the box, the board reads as a framed card rather than a cropped screen.
    this.canvas.dataset.framed = String(width - size.width > 2 || height - size.height > 2)
    this.canvas.width = Math.round(size.width * dpr)
    this.canvas.height = Math.round(size.height * dpr)
    const scale = size.scale * dpr
    this.scale = scale
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0)
    this.monitor?.event(
      `canvas ${this.canvas.width}×${this.canvas.height} px at ${dpr}x for ${Math.round(size.width)}×${Math.round(size.height)} css px`,
    )
    // A field that grew or shrank must not leave the hippo or the pipes outside it.
    const ratio = next.groundY / this.world.groundY
    this.state.hippoY = Math.min(this.state.hippoY * ratio, next.groundY - 1)
    for (const pipe of this.state.pipes) pipe.gapY *= ratio
    for (const pickup of this.state.pickups) pickup.y *= ratio
    this.world = next
    this.dirty = true
    this.settle = SETTLE_FRAMES
  }

  setTheme(dark: boolean): void {
    this.palette = resolvePalette(dark)
    this.dirty = true
  }

  setSound(on: boolean): void {
    this.sfx.setMuted(!on)
  }

  setHaptics(on: boolean): void {
    this.haptics = on
  }

  /** Freezes the loop entirely while the menu covers the board; pauses a live round as well. */
  setSuspended(suspended: boolean): void {
    if (suspended) this.pause()
    this.suspended = suspended
    this.dirty = true
  }

  /**
   * Switching difficulty never disturbs a round in progress: a change made from the paused menu
   * waits for the next one, and on the game-over card only the record shown updates.
   */
  setDifficulty(id: DifficultyId, best: number): void {
    this.state.best = best
    if (this.state.phase === 'running') {
      this.pending = difficultyById(id)
      this.push()
      return
    }
    this.difficulty = difficultyById(id)
    this.pending = null
    if (this.state.phase === 'ready') {
      this.state = initialState({ world: this.world, difficulty: this.difficulty, best })
      this.sky = initialSky()
      this.dirty = true
    }
    this.push()
  }

  setBest(best: number): void {
    this.state.best = best
    this.push()
  }

  /** The one input the game has. Starts a round, flaps, or begins the next round after a crash. */
  flap(): void {
    if (this.suspended || this.frozen) return
    const now = performance.now()
    const state = this.state
    if (this.paused) {
      this.resume()
      return
    }
    if (state.phase === 'over') {
      if (now - state.overAt < RESTART_DELAY_MS) return
      this.restart()
      return
    }
    if (state.phase === 'ready') {
      state.phase = 'running'
      state.startedAt = now
    }
    // A flap during the count-in means "I'm ready" — no need to wait it out.
    this.countdownUntil = 0
    flap(state, now)
    this.sfx.play('flap')
    buzz(this.haptics, 6)
    this.push()
  }

  /** Away from the game: the round waits, and nothing already scheduled plays on into the silence. */
  private leave(): void {
    this.pause()
    this.sfx.silence()
  }

  restart(): void {
    const now = performance.now()
    this.hit = null
    this.sfx.silence()
    this.applyPending()
    this.state = initialState({
      world: this.world,
      difficulty: this.difficulty,
      best: this.state.best,
      round: this.state.round + 1,
    })
    this.state.phase = 'running'
    this.state.startedAt = now
    flap(this.state, now)
    this.paused = false
    this.frozen = false
    this.countdownUntil = 0
    this.sfx.play('flap')
    this.push()
  }

  /** Freezes a live round. Returns whether there was one to freeze. */
  pause(): boolean {
    if (this.state.phase !== 'running' || this.paused) return false
    this.paused = true
    this.frozen = false
    this.dirty = true
    this.push()
    return true
  }

  /** Lifts the pause and counts back in, so the round never resumes into a dive nobody saw coming. */
  resume(): boolean {
    if (!this.paused) return false
    this.paused = false
    this.state.velocity = Math.min(this.state.velocity, 0)
    this.countdownUntil = performance.now() + COUNTDOWN_MS
    this.push()
    return true
  }

  /**
   * Freezes a live round with nothing drawn over it, or lifts that freeze with the count-in.
   * Returns what it did, or null when there was no live round.
   */
  toggleFreeze(): 'frozen' | 'resumed' | null {
    if (this.frozen) {
      this.frozen = false
      this.state.velocity = Math.min(this.state.velocity, 0)
      this.countdownUntil = performance.now() + COUNTDOWN_MS
      this.push()
      return 'resumed'
    }
    if (this.state.phase !== 'running' || this.paused) return null
    this.frozen = true
    this.dirty = true
    return 'frozen'
  }

  /** Gives up the current round — the score still counts. */
  surrender(): void {
    if (this.state.phase !== 'running') return
    this.paused = false
    this.frozen = false
    this.countdownUntil = 0
    gameOver(this.state, performance.now(), this.events)
    this.drain()
  }

  /** An achievement just unlocked — the toast is React's, the chime and the buzz are ours. */
  celebrateUnlock(): void {
    this.sfx.play('achievement')
    buzz(this.haptics, [15, 50, 15])
  }

  /** The live state and field, for tooling that stages a scene (the screenshot script). */
  inspect(): { state: GameState; world: World } {
    return { state: this.state, world: this.world }
  }

  summary(): RunSummary {
    const { score, pipesCleared, melons, shields, saves, elapsed, potsDodged, moversPassed } = this.state
    return {
      hit: this.hit,
      score,
      pipes: pipesCleared,
      melons,
      shields,
      saves,
      seconds: elapsed,
      pots: potsDodged,
      movers: moversPassed,
      difficulty: this.difficulty.id,
    }
  }

  private applyPending(): void {
    if (!this.pending) return
    this.difficulty = this.pending
    this.pending = null
  }

  private countdown(now: number): number {
    return Math.max(Math.ceil((this.countdownUntil - now) / (COUNTDOWN_MS / 3)), 0)
  }

  /**
   * Whether anything on the canvas is moving. A paused or suspended board is still; so is the
   * game-over scene once the sky has finished falling — the card on top has the numbers, and a
   * phone left on that screen should not spend its battery redrawing it.
   */
  private live(now: number): boolean {
    if (this.suspended || this.paused || this.frozen) return false
    const s = this.state
    if (s.phase !== 'over') return true
    return now - s.overAt < OVER_SETTLE_MS || s.particles.length > 0
  }

  private step(now: number): void {
    const elapsed = (now - this.last) / 1000
    const dt = Math.min(elapsed, MAX_FRAME_S)
    this.last = now
    const live = this.live(now)
    if (!live && !this.dirty) {
      this.wasLive = false
      return
    }
    const began = performance.now()

    // Suspended (the menu is up), paused, or counting back in: nothing moves, but a frame that
    // was marked dirty — a theme switch made from that very menu — is still painted once.
    const frozen = this.suspended || this.paused || this.frozen || now < this.countdownUntil
    if (!frozen) {
      advance(this.state, dt, now, this.world, this.difficulty, this.events)
      this.drain()
    }
    if (this.effects && !this.suspended) animateSky(this.sky, this.state, now, dt)
    this.cache.prepare(this.scale, this.palette, this.world.groundY)
    if (this.fontsIn) {
      this.fontsIn = false
      warmUp(this.ctx, this.palette, this.world, now, this.cache)
      this.monitor?.event(`warm-up drawn: ${this.cache.takeBakes().join(', ') || 'nothing new'}`)
    }
    drawScene(this.ctx, this.state, this.world, this.palette, this.sky, now, this.effects, this.cache)
    this.dirty = false
    const drawn = performance.now()
    this.push(now)
    const work = (drawn - began) / 1000
    this.govern(elapsed, work)
    const bakes = this.cache.takeBakes()
    if (this.monitor && this.wasLive && live) {
      this.monitor.frame(now, elapsed * 1000, work * 1000, performance.now() - drawn, {
        phase: this.state.phase,
        score: this.state.score,
        bakes,
        dpr: this.fitted.dpr,
      })
    }
    this.wasLive = live
  }

  /** Judges the frames of each second; the idle title card counts too, it is what a first launch shows. */
  private govern(elapsed: number, busy: number): void {
    if (this.paused || this.frozen || this.suspended || elapsed > STALL_S) return
    if (this.settle > 0) {
      this.settle -= 1
      return
    }
    this.judgedS += elapsed
    this.judged += 1
    if (elapsed > SLOW_FRAME_S && busy > BUSY_S) this.slowFrames += 1
    if (this.judgedS < JUDGE_S) return
    const slow = this.slowFrames >= this.judged * JUDGE_SHARE
    this.judgedS = 0
    this.judged = 0
    this.slowFrames = 0
    if (!slow) return
    if (this.dprCap > DPR_FLOOR) {
      this.dprCap = Math.max(DPR_FLOOR, this.dprCap - 0.5)
      this.monitor?.event(`quality: most frames ran long, resolution capped at ${this.dprCap}x`)
      this.measure()
    } else if (!this.lite) {
      this.lite = true
      applyLite(true)
      this.monitor?.event('quality: still slow at 1x, blur off')
    } else {
      return
    }
    saveQuality({ dpr: this.dprCap, lite: this.lite })
  }

  private drain(): void {
    if (this.events.length === 0) return
    for (const event of this.events) {
      this.react(event)
      this.options.onEvent(event)
    }
    this.events.length = 0
  }

  private react(event: GameEvent): void {
    switch (event.type) {
      case 'score':
        this.sfx.play('score')
        return
      case 'melon':
        this.sfx.play('melon')
        buzz(this.haptics, 8)
        return
      case 'shield':
        this.sfx.play('shield')
        buzz(this.haptics, [8, 30, 8])
        return
      case 'shield-pop':
        this.sfx.play('pop')
        buzz(this.haptics, [20, 40, 20])
        return
      case 'smash':
        this.sfx.play('smash')
        return
      case 'dodge':
        return
      case 'stage':
        buzz(this.haptics, [10, 30, 10])
        return
      case 'milestone':
        this.sfx.play('milestone')
        return
      case 'record':
        this.sfx.play('record')
        buzz(this.haptics, [10, 40, 10, 40, 30])
        return
      case 'crash':
        // Only a landing counts: hitting a pipe far above the street flattens nothing.
        this.hit =
          this.state.hippoY >= this.world.groundY - HIPPO_RADIUS - 1
            ? furnitureUnder(this.state.scrolled, this.world.hippoX, this.state.round)
            : null
        this.sfx.play('crash')
        buzz(this.haptics, [40, 60, 90])
        return
    }
  }

  private readSnapshot(now = performance.now()): Snapshot {
    const s = this.state
    return {
      phase: s.phase,
      paused: this.paused,
      countdown: this.countdown(now),
      score: s.score,
      best: s.best,
      newBest: s.newBest,
      charges: s.charges,
      melons: s.melons,
      round: s.round,
      difficulty: this.difficulty.id,
      stage: s.stage,
    }
  }

  /** React only hears from the loop when something it renders actually changed. */
  private push(now = performance.now()): void {
    const s = this.state
    const prev = this.snapshot
    // Compared field by field before anything is allocated: this runs every frame.
    const same =
      s.phase === prev.phase &&
      this.paused === prev.paused &&
      this.countdown(now) === prev.countdown &&
      s.score === prev.score &&
      s.best === prev.best &&
      s.newBest === prev.newBest &&
      s.charges === prev.charges &&
      s.melons === prev.melons &&
      s.round === prev.round &&
      this.difficulty.id === prev.difficulty &&
      s.stage === prev.stage
    if (same) return
    this.snapshot = this.readSnapshot(now)
    this.options.onSnapshot(this.snapshot)
  }
}
