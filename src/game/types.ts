/** Shared shapes for the simulation. Everything here is plain data: no DOM, no React. */

export type Phase = 'ready' | 'running' | 'over'

export type PickupKind = 'melon' | 'shield'

export interface Pipe {
  x: number
  /** Centre of the gap, in world units from the top. */
  gapY: number
  /** Half the vertical opening, frozen at spawn so a difficulty ramp never moves a live pipe. */
  half: number
  passed: boolean
}

export interface Pickup {
  kind: PickupKind
  x: number
  y: number
  taken: boolean
  /** Phase offset so a row of melons doesn't bob in lockstep. */
  seed: number
}

export interface Spark {
  angle: number
  speed: number
  size: number
}

export interface Rocket {
  x: number
  drift: number
  peakY: number
  launchAt: number
  sparks: Spark[]
}

/** Which palette colour a particle borrows — resolved at draw time, so a theme swap re-tints them. */
export type Tint = 'melon' | 'bubble' | 'dust'

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  /** Seconds the particle started with, so the renderer can fade it out. */
  maxLife: number
  size: number
  tint: Tint
  /** Gravity multiplier: 0 floats (bubble shards), 1 falls (melon juice). */
  weight: number
}

export interface GameState {
  phase: Phase
  hippoY: number
  velocity: number
  pipes: Pipe[]
  pickups: Pickup[]
  /** Distance travelled, in world units — pipes spawn on distance, not on a timer. */
  scrolled: number
  /** Distance at which the next pipe enters from the right. */
  nextSpawn: number
  score: number
  pipesCleared: number
  melons: number
  /** Shields collected this round. */
  shields: number
  /** Hits a shield absorbed this round. */
  saves: number
  /** A shield in hand absorbs the next hit. */
  shielded: boolean
  /** Timestamp until which collisions are ignored, right after a shield pops. */
  solidUntil: number
  best: number
  newBest: boolean
  round: number
  overTitle: string
  overAt: number
  startedAt: number
  flappedAt: number
  /** Seconds of running time this round, for the stats screen. */
  elapsed: number
  fireworks: Rocket[]
  particles: Particle[]
}

/** Things worth a sound, a buzz or a React re-render. Collected per frame by `advance`. */
export type GameEvent =
  | { type: 'score'; score: number }
  | { type: 'melon'; score: number }
  | { type: 'shield' }
  | { type: 'shield-pop' }
  | { type: 'milestone'; score: number }
  /** The running score just passed the record set in an earlier round. */
  | { type: 'record'; score: number }
  | { type: 'crash'; score: number; best: number; newBest: boolean }

export interface Palette {
  night: boolean
  sky: string
  skyLow: string
  sun: string
  sunHalo: string
  moon: string
  moonGlow: string
  star: string
  firework: string
  cloud: string
  cityFar: string
  cityNear: string
  window: string
  haze: string
  hazeNear: string
  ground: string
  groundLine: string
  groundHighlight: string
  pipe: string
  pipeEdge: string
  text: string
  brand: string
  gold: string
  melon: string
  melonRind: string
  melonSeed: string
  bubble: string
  bubbleEdge: string
  hippoBody: string
  hippoShade: string
  hippoDark: string
  hippoLight: string
  hippoEar: string
  wing: string
}
