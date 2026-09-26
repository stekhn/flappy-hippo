import { createSfx } from './audio.ts'
import type { Sfx } from './audio.ts'
import { MAX_FRAME_S, RESTART_DELAY_MS } from './constants.ts'
import { difficultyById } from './difficulty.ts'
import type { Difficulty, DifficultyId } from './difficulty.ts'
import { resolvePalette } from './palette.ts'
import { drawScene } from './render/scene.ts'
import { animateSky, initialSky } from './render/scenery.ts'
import type { SkyMotion } from './render/scenery.ts'
import { advance, flap, gameOver, initialState } from './state.ts'
import type { GameEvent, GameState, Palette } from './types.ts'
import { canvasSize, fitWorld } from './world.ts'
import type { World } from './world.ts'

/** What the React layer needs to render the HUD and the cards. Pushed only when it changes. */
export interface Snapshot {
  phase: GameState['phase']
  paused: boolean
  score: number
  best: number
  newBest: boolean
  shielded: boolean
  melons: number
  overTitle: string
  round: number
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
  onEvent: (event: GameEvent, state: GameState) => void
}

function buzz(enabled: boolean, pattern: number | number[]): void {
  if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) return
  try {
    navigator.vibrate(pattern)
  } catch {
    /* some browsers throw when the page is not visible */
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

  private world: World
  private palette: Palette
  private difficulty: Difficulty
  private state: GameState
  private sky: SkyMotion = initialSky()
  private events: GameEvent[] = []
  private frame = 0
  private last = 0
  private paused = false
  /** A difficulty picked mid-round, applied when the next one starts. */
  private pending: Difficulty | null = null
  private haptics: boolean
  private snapshot: Snapshot
  private observer: ResizeObserver | null = null
  // Switching apps, tabs or windows must not cost the round.
  private readonly onHidden = () => {
    if (document.hidden) this.pause()
  }
  private readonly onBlur = () => this.pause()

  constructor(options: RuntimeOptions) {
    const ctx = options.canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D is not available')
    this.canvas = options.canvas
    this.ctx = ctx
    this.options = options
    this.haptics = options.haptics
    this.sfx = createSfx(!options.sound)
    this.difficulty = difficultyById(options.difficulty)
    this.palette = resolvePalette(options.dark)
    this.world = fitWorld(options.box.clientWidth, options.box.clientHeight)
    this.state = initialState({ world: this.world, difficulty: this.difficulty, best: options.best })
    this.snapshot = this.readSnapshot()
  }

  start(): void {
    this.measure()
    this.observer = new ResizeObserver(() => this.measure())
    this.observer.observe(this.options.box)
    document.addEventListener('visibilitychange', this.onHidden)
    window.addEventListener('blur', this.onBlur)
    this.last = performance.now()
    const loop = (now: number) => {
      this.step(now)
      this.frame = requestAnimationFrame(loop)
    }
    this.frame = requestAnimationFrame(loop)
  }

  destroy(): void {
    cancelAnimationFrame(this.frame)
    document.removeEventListener('visibilitychange', this.onHidden)
    window.removeEventListener('blur', this.onBlur)
    this.observer?.disconnect()
    this.observer = null
    this.sfx.dispose()
  }

  /** Re-fits the play field to the box and rebuilds the backing store at device resolution. */
  measure(): void {
    const { width, height } = this.options.box.getBoundingClientRect()
    if (width < 1 || height < 1) return
    const next = fitWorld(width, height)
    const size = canvasSize(next, width, height)
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    this.canvas.style.width = `${size.width}px`
    this.canvas.style.height = `${size.height}px`
    // Short of filling the box, the board reads as a framed card rather than a cropped screen.
    this.canvas.dataset.framed = String(width - size.width > 2 || height - size.height > 2)
    this.canvas.width = Math.round(size.width * dpr)
    this.canvas.height = Math.round(size.height * dpr)
    const scale = size.scale * dpr
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0)
    // A field that grew or shrank must not leave the hippo or the pipes outside it.
    const ratio = next.groundY / this.world.groundY
    this.state.hippoY = Math.min(this.state.hippoY * ratio, next.groundY - 1)
    for (const pipe of this.state.pipes) pipe.gapY *= ratio
    for (const pickup of this.state.pickups) pickup.y *= ratio
    this.world = next
  }

  setTheme(dark: boolean): void {
    this.palette = resolvePalette(dark)
  }

  setSound(on: boolean): void {
    this.sfx.setMuted(!on)
  }

  setHaptics(on: boolean): void {
    this.haptics = on
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
    }
    this.push()
  }

  setBest(best: number): void {
    this.state.best = best
    this.push()
  }

  /** The one input the game has. Starts a round, flaps, or begins the next round after a crash. */
  flap(): void {
    this.sfx.unlock()
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
    flap(state, now)
    this.sfx.play('flap')
    buzz(this.haptics, 6)
    this.push()
  }

  restart(): void {
    const now = performance.now()
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
    this.sfx.unlock()
    this.sfx.play('flap')
    this.push()
  }

  pause(): void {
    if (this.state.phase !== 'running' || this.paused) return
    this.paused = true
    this.push()
  }

  resume(): void {
    if (!this.paused) return
    this.paused = false
    // Resuming from a dive would end the round before anyone can react
    this.state.velocity = Math.min(this.state.velocity, 0)
    this.push()
  }

  togglePause(): void {
    if (this.paused) this.resume()
    else this.pause()
  }

  /** Gives up the current round — the score still counts. */
  surrender(): void {
    if (this.state.phase !== 'running') return
    this.paused = false
    gameOver(this.state, performance.now(), this.events)
    this.drain()
  }

  /** Numbers for the stats and the score table, read once when a round ends. */
  summary() {
    const { score, pipesCleared, melons, shields, saves, elapsed } = this.state
    return {
      score,
      pipes: pipesCleared,
      melons,
      shields,
      saves,
      seconds: elapsed,
      // The difficulty the round was actually played on, not the one now selected.
      difficulty: this.difficulty.id,
    }
  }

  private applyPending(): void {
    if (!this.pending) return
    this.difficulty = this.pending
    this.pending = null
  }

  isPaused(): boolean {
    return this.paused
  }

  private step(now: number): void {
    const dt = Math.min((now - this.last) / 1000, MAX_FRAME_S)
    this.last = now
    if (!this.paused) {
      advance(this.state, dt, now, this.world, this.difficulty, this.events)
      this.drain()
    }
    animateSky(this.sky, this.state, now, dt)
    drawScene(this.ctx, this.state, this.world, this.palette, this.sky, now)
    this.push()
  }

  private drain(): void {
    if (this.events.length === 0) return
    for (const event of this.events) {
      this.react(event)
      this.options.onEvent(event, this.state)
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
      case 'milestone':
        this.sfx.play('milestone')
        return
      case 'crash':
        this.sfx.play('crash')
        buzz(this.haptics, [40, 60, 90])
        return
    }
  }

  private readSnapshot(): Snapshot {
    const s = this.state
    return {
      phase: s.phase,
      paused: this.paused,
      score: s.score,
      best: s.best,
      newBest: s.newBest,
      shielded: s.shielded,
      melons: s.melons,
      overTitle: s.overTitle,
      round: s.round,
    }
  }

  /** React only hears from the loop when something it renders actually changed. */
  private push(): void {
    const next = this.readSnapshot()
    const prev = this.snapshot
    const same =
      next.phase === prev.phase &&
      next.paused === prev.paused &&
      next.score === prev.score &&
      next.best === prev.best &&
      next.newBest === prev.newBest &&
      next.shielded === prev.shielded &&
      next.melons === prev.melons &&
      next.round === prev.round
    if (same) return
    this.snapshot = next
    this.options.onSnapshot(next)
  }
}
