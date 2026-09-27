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
  /** Where the gap's centre rests; a moving pipe swings `swing` above and below it. */
  baseY: number
  swing: number
  /** Where in its swing the pipe started, so a row of movers is not in lockstep. */
  phase: number
}

/**
 * A flower pot: rests on the top edge ahead of the hippo, wobbling, and lets go when the hippo
 * is `lead` seconds away, so that it comes down past the hippo's line at the height it was
 * aimed at. Then it tumbles, and smashes on the wall or on the hippo.
 */
export interface Pot {
  x: number
  y: number
  vy: number
  /** Seconds its fall takes to the height it is aimed at. */
  lead: number
  falling: boolean
  /** Wobble while resting, tumble while falling. */
  spin: number
  /** Went past the hippo without hitting it. */
  passed: boolean
  smashed: boolean
  seed: number
}

export interface Pickup {
  kind: PickupKind
  x: number
  y: number
  taken: boolean
  /** Phase offset so a row of melons doesn't bob in lockstep. */
  seed: number
}

/** A piece of confetti thrown at a milestone: a small tumbling rectangle, or a dot. */
export interface Confetti {
  x: number
  y: number
  vx: number
  vy: number
  /** The in-plane turn, and the flip about the long axis that makes a flat piece look like paper. */
  angle: number
  spin: number
  flip: number
  flipRate: number
  w: number
  h: number
  round: boolean
  /** Index into the palette's confetti colours. */
  tint: number
  life: number
  /** Side-to-side flutter phase. */
  seed: number
}

/** Which palette colour a particle borrows — resolved at draw time, so a theme swap re-tints them. */
export type Tint = 'melon' | 'bubble' | 'pot'

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
  /** Gravity multiplier: 0 floats (bubble shards), 1 falls (melon juice, pot shards). */
  weight: number
}

/** A little label rising from where something was picked up: "+3", "Schild". */
export interface Floater {
  text: string
  x: number
  y: number
  born: number
  tint: 'melon' | 'shield'
}

export interface GameState {
  phase: Phase
  hippoY: number
  velocity: number
  pipes: Pipe[]
  pickups: Pickup[]
  pots: Pot[]
  /** Pots that came down past the hippo without hitting it, and moving pipes cleared. */
  potsDodged: number
  moversPassed: number
  /** Pipe slots since the last pot, so two never come in a row. */
  pipesSincePot: number
  /** The stage the score has reached (0, then pots, then movers), and when it was reached. */
  stage: number
  stageAt: number
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
  /** Shield charges in hand; each absorbs one hit. */
  charges: number
  /** Timestamp until which collisions are ignored, right after a shield pops. */
  solidUntil: number
  /** When the latest shield was picked up (the bubble grows in) and when one last popped. */
  shieldAt: number
  poppedAt: number
  floaters: Floater[]
  best: number
  newBest: boolean
  round: number
  overTitle: string
  overAt: number
  startedAt: number
  flappedAt: number
  /** Seconds of running time this round, for the stats screen. */
  elapsed: number
  confetti: Confetti[]
  particles: Particle[]
}

/** Things worth a sound, a buzz or a React re-render. Collected per frame by `advance`. */
export type GameEvent =
  | { type: 'score'; score: number }
  | { type: 'melon'; score: number }
  | { type: 'shield' }
  | { type: 'shield-pop' }
  /** A pot went past without hitting; a pot smashed, on the wall or on the bubble. */
  | { type: 'dodge' }
  | { type: 'smash' }
  /** The score just reached a new stage. */
  | { type: 'stage'; stage: number }
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
  /** Confetti colours: the game's own accents, cycled. Filled shapes, so they read on any sky. */
  confetti: string[]
  cloud: string
  cityFar: string
  cityNear: string
  window: string
  haze: string
  hazeNear: string
  ground: string
  groundLine: string
  groundHighlight: string
  /** Greenery: lit side warm and yellow, shade side cool and blue, as a painter would mix it. */
  grassLit: string
  grassShade: string
  grassShadow: string
  bushLit: string
  bushShade: string
  bushEdge: string
  flower: string
  flowerCenter: string
  /** Street furniture: bench slats, the postbox, lamp posts. Metal borrows the hippo's greys. */
  wood: string
  postbox: string
  lamp: string
  pipe: string
  pipeEdge: string
  /** The pipe's soft highlight side. */
  pipeLight: string
  text: string
  brand: string
  gold: string
  /** The melon's colour wherever it stands for melons: the counter, the glow, the points. */
  melon: string
  /** The wedge's flesh and its juice. */
  melonFlesh: string
  melonRind: string
  melonSeed: string
  /** The shield's colour: the bubble's rim, its glow, its shards, its emblem. */
  bubbleEdge: string
  hippoBody: string
  hippoShade: string
  hippoDark: string
  hippoLight: string
  hippoEar: string
  wing: string
}
