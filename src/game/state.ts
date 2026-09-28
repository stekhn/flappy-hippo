import {
  CONFETTI_BASE,
  CONFETTI_DRAG,
  CONFETTI_GRAVITY,
  CONFETTI_LIFE_S,
  CONFETTI_MAX,
  CONFETTI_SPEED,
  FLOATER_MS,
  FLAP_VELOCITY,
  GAP_MARGIN,
  GRAVITY,
  HIPPO_RADIUS,
  INVULNERABLE_MS,
  MAX_FALL_SPEED,
  MAX_SHIELDS,
  MELON_CHANCE,
  MELON_REACH,
  MELON_POINTS,
  MILESTONE_STEP,
  MOVER_MIN_JUMP,
  MOVER_PERIOD_S,
  PICKUP_RADIUS,
  PIPE_WIDTH,
  POT_AIM,
  POT_GRAVITY,
  POT_MAX_FALL,
  POT_RADIUS,
  POT_REST_Y,
  POT_SPACING,
  SHIELD_CHANCE,
  SHIELD_EARLIEST_PIPE,
  STAGE_MOVERS,
  STAGE_POTS,
} from './constants.ts'
import { tuningFor } from './difficulty.ts'
import type { Difficulty, Tuning } from './difficulty.ts'
import type { Confetti, GameEvent, GameState, Particle, Pipe, Pot, Tint } from './types.ts'
import type { World } from './world.ts'

/** Drops the items that fail `test`, in place: no fresh array every frame for the collector to chase. */
function keep<T>(items: T[], test: (item: T) => boolean): T[] {
  let n = 0
  for (const item of items) if (test(item)) items[n++] = item
  items.length = n
  return items
}

/** Where a pipe enters the field, just out of sight on the right. */
function spawnX(world: World): number {
  return world.width + PIPE_WIDTH
}

/** A pipe is already on screen at the start, so the ready screen shows what is coming. */
function firstPipeX(world: World): number {
  return Math.round(world.width * 0.82)
}

/**
 * Where the next gap goes: anywhere within `jump` of the previous gap that still keeps the
 * opening clear of the ceiling and the ground. Drawing from that window rather than from the
 * whole field is what makes every screen shape the same challenge.
 */
function nextGapY(world: World, previous: number, half: number, jump: number): number {
  const margin = half + GAP_MARGIN
  const low = Math.max(margin, previous - jump)
  const high = Math.min(world.groundY - margin, previous + jump)
  if (high <= low) return Math.min(Math.max(previous, margin), world.groundY - margin)
  return low + Math.random() * (high - low)
}

/** What a new pipe is measured from: the pipe before it, or the hippo's start for the first. */
interface Anchor {
  baseY: number
  swing: number
}

const MOVER_OMEGA = (Math.PI * 2) / MOVER_PERIOD_S

function makePipe(world: World, x: number, tuning: Tuning, previous: Anchor, moving: boolean): Pipe {
  const half = tuning.gap / 2
  const swing = moving ? tuning.swing : 0
  // The walk and the swings share the jump: wherever both pipes are in their travel, the two
  // gaps are never further apart than the difficulty allows. A swinging gap also keeps all of
  // its travel clear of the ceiling and the ground.
  const jump = Math.max(tuning.jump - previous.swing - swing, MOVER_MIN_JUMP)
  const baseY = nextGapY(world, previous.baseY, half + swing, jump)
  return { x, gapY: baseY, half, passed: false, baseY, swing, phase: Math.random() * Math.PI * 2 }
}

export interface InitOptions {
  world: World
  difficulty: Difficulty
  best: number
  round?: number
}

export function initialState({ world, difficulty, best, round = 0 }: InitOptions): GameState {
  const tuning = tuningFor(difficulty, 0, world)
  // The first gap is measured from where the hippo starts, so the opening round is fair too.
  const first = makePipe(world, firstPipeX(world), tuning, { baseY: world.groundY / 2, swing: 0 }, false)
  // The first pipe is placed mid-flight, so the spawn counter starts part-way through a cycle.
  const travelled = spawnX(world) - first.x
  return {
    phase: 'ready',
    hippoY: world.groundY / 2,
    velocity: 0,
    pipes: [first],
    pickups: [],
    pots: [],
    potsDodged: 0,
    moversPassed: 0,
    pipesSincePot: POT_SPACING,
    stage: 0,
    pending: 0,
    dueMover: false,
    duePot: false,
    scrolled: 0,
    nextSpawn: Math.max(tuning.spacing - travelled, 0),
    score: 0,
    pipesCleared: 0,
    melons: 0,
    shields: 0,
    saves: 0,
    charges: 0,
    solidUntil: 0,
    shieldAt: 0,
    poppedAt: 0,
    floaters: [],
    best,
    newBest: false,
    round,
    overAt: 0,
    startedAt: 0,
    flappedAt: 0,
    elapsed: 0,
    confetti: [],
    particles: [],
  }
}

/** One upward beat of the wings. */
export function flap(state: GameState, now: number): void {
  state.velocity = FLAP_VELOCITY
  state.flappedAt = now
}

/** What hangs in this pipe's slot, if anything: a shield in its gap, or a melon on the way to the next. */
function spawnPickup(state: GameState, world: World, pipe: Pipe, tuning: Tuning): 'shield' | 'melon' | null {
  // A shield sits in the gap the player is aiming for anyway — a reward for precision, not a
  // detour — so never in a gap that moves away from under it.
  const eligible = pipe.swing === 0 && state.pipesCleared >= SHIELD_EARLIEST_PIPE && state.charges < MAX_SHIELDS
  if (eligible && Math.random() < SHIELD_CHANCE) {
    state.pickups.push({
      kind: 'shield',
      x: pipe.x + PIPE_WIDTH / 2,
      y: pipe.gapY,
      taken: false,
      seed: Math.random() * Math.PI * 2,
    })
    return 'shield'
  }
  if (Math.random() >= MELON_CHANCE) return null
  // Melons hang in the open water between two pipes, within reach of the gap just passed (the
  // next gap is never further than a jump from it either): worth points, worth a detour, and
  // sometimes worth leaving alone. On a tall field a melon anywhere would mostly be out of reach.
  const margin = PICKUP_RADIUS + GAP_MARGIN
  const reach = tuning.jump * MELON_REACH
  const low = Math.max(margin, pipe.baseY - reach)
  const high = Math.min(world.groundY - margin, pipe.baseY + reach)
  state.pickups.push({
    kind: 'melon',
    x: pipe.x + tuning.spacing / 2,
    y: low + Math.random() * Math.max(high - low, 0),
    taken: false,
    seed: Math.random() * Math.PI * 2,
  })
  return 'melon'
}

/** Seconds a pot takes to fall `distance` from rest, terminal speed included. */
export function fallTime(distance: number): number {
  const toTerminal = (POT_MAX_FALL * POT_MAX_FALL) / (2 * POT_GRAVITY)
  if (distance <= toTerminal) return Math.sqrt((2 * Math.max(distance, 0)) / POT_GRAVITY)
  return POT_MAX_FALL / POT_GRAVITY + (distance - toTerminal) / POT_MAX_FALL
}

/**
 * From the pot stage on, a flower pot on the top edge midway to the next pipe: not where a
 * melon hangs, never in two slots running. It is aimed near the line the hippo is likely to fly,
 * so it has to be answered, and never at the very top or bottom, so there is always a way past.
 */
function spawnPot(state: GameState, world: World, pipe: Pipe, tuning: Tuning, pickup: 'shield' | 'melon' | null): void {
  state.pipesSincePot += 1
  if (pickup === 'melon' || state.pipesSincePot < POT_SPACING) return
  if (!state.duePot && Math.random() >= tuning.pots) return
  state.duePot = false
  state.pipesSincePot = 0
  const margin = POT_RADIUS + GAP_MARGIN
  const aim = pipe.baseY + (Math.random() * 2 - 1) * tuning.jump * POT_AIM
  const crossY = Math.min(Math.max(aim, margin), world.groundY - margin)
  state.pots.push({
    x: pipe.x + tuning.spacing / 2,
    y: POT_REST_Y,
    vy: 0,
    lead: fallTime(crossY - POT_REST_Y),
    falling: false,
    spin: 0,
    passed: false,
    smashed: false,
    seed: Math.random() * Math.PI * 2,
  })
}

/** Shards in the pot's colour, and the pot is gone; its balcony stays until it has scrolled off. */
function smash(state: GameState, pot: Pot, y: number, events: GameEvent[]): void {
  burst(state, pot.x, y, 8, 'pot', 90, 1)
  pot.smashed = true
  events.push({ type: 'smash' })
}

/**
 * The pots' frame: resting ones wobble and let go once the hippo is their fall's time away;
 * falling ones tumble down, smash on the wall, or are counted as dodged once they are behind
 * the hippo. Returns the pot the hippo is touching, if any.
 */
function stepPots(
  state: GameState,
  dt: number,
  dx: number,
  world: World,
  tuning: Tuning,
  events: GameEvent[],
): Pot | null {
  let struck: Pot | null = null
  const reach = HIPPO_RADIUS + POT_RADIUS
  for (const pot of state.pots) {
    pot.x -= dx
    if (pot.smashed) continue
    if (state.pending === 2 && !pot.passed && pot.x - world.hippoX < tuning.speed * NOTICE_LEAD_S) {
      announce(state, 2, events)
    }
    if (!pot.falling) {
      pot.spin = Math.sin(state.elapsed * 14 + pot.seed) * 0.12
      if (pot.x - world.hippoX <= tuning.speed * pot.lead) pot.falling = true
      continue
    }
    pot.vy = Math.min(pot.vy + POT_GRAVITY * dt, POT_MAX_FALL)
    pot.y += pot.vy * dt
    pot.spin += (pot.seed < Math.PI ? 3 : -3) * dt
    if (pot.y >= world.groundY - POT_RADIUS * 0.4) {
      smash(state, pot, world.groundY - 3, events)
      continue
    }
    if (!pot.passed && pot.x + POT_RADIUS < world.hippoX - HIPPO_RADIUS) {
      pot.passed = true
      state.potsDodged += 1
      events.push({ type: 'dodge' })
    }
    const ddx = pot.x - world.hippoX
    const ddy = pot.y - state.hippoY
    if (ddx * ddx + ddy * ddy < reach * reach) struck = pot
  }
  keep(state.pots, (pot) => pot.x > -60)
  return struck
}

function burst(state: GameState, x: number, y: number, count: number, tint: Tint, speed: number, weight: number): void {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5
    const power = speed * (0.4 + Math.random() * 0.8)
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * power,
      vy: Math.sin(angle) * power,
      life: 0.5 + Math.random() * 0.45,
      maxLife: 0.95,
      size: 1.4 + Math.random() * 2.2,
      tint,
      weight,
    })
  }
}

/**
 * Two party poppers, one in each bottom corner, aimed up and inward: steeper on a tall phone so
 * the paper climbs to the hippo rather than crossing the field, wider on a landscape field so it
 * reaches well in from the sides. More points, more paper.
 */
function throwConfetti(state: GameState, world: World): void {
  const count = Math.min(CONFETTI_BASE + Math.floor(state.score / MILESTONE_STEP) * 6, CONFETTI_MAX)
  const widest = world.width > world.groundY ? 0.7 : 0.42
  for (let i = 0; i < count; i++) {
    const left = i % 2 === 0
    const tilt = (0.15 + Math.random() * (widest - 0.15)) * (left ? 1 : -1)
    const speed = world.groundY * (CONFETTI_SPEED[0] + Math.random() * (CONFETTI_SPEED[1] - CONFETTI_SPEED[0]))
    const round = Math.random() < 0.25
    state.confetti.push({
      x: left ? 6 : world.width - 6,
      y: world.groundY - 4,
      vx: Math.sin(tilt) * speed,
      vy: -Math.cos(tilt) * speed,
      angle: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 10,
      flip: Math.random() * Math.PI,
      flipRate: 6 + Math.random() * 8,
      w: round ? 3.4 : 5 + Math.random() * 3,
      h: round ? 3.4 : 3 + Math.random() * 1.5,
      round,
      tint: Math.floor(Math.random() * 3),
      life: CONFETTI_LIFE_S * (0.75 + Math.random() * 0.25),
      seed: Math.random() * Math.PI * 2,
    })
  }
}

function stepConfetti(pieces: Confetti[], dt: number): Confetti[] {
  const drag = 1 - CONFETTI_DRAG * dt
  for (const piece of pieces) {
    piece.life -= dt
    piece.vx *= drag
    piece.vy = piece.vy * drag + CONFETTI_GRAVITY * dt
    piece.x += piece.vx * dt + Math.sin(piece.life * 5 + piece.seed) * 16 * dt
    piece.y += piece.vy * dt
    piece.angle += piece.spin * dt
    piece.flip += piece.flipRate * dt
  }
  return keep(pieces, (piece) => piece.life > 0)
}

/** Seconds before a stage's first obstacle reaches the hippo that the stage is announced. */
const NOTICE_LEAD_S = 2

function announce(state: GameState, stage: number, events: GameEvent[]): void {
  state.stage = stage
  state.pending = 0
  events.push({ type: 'stage', stage })
}

/** Everything that may follow a point: a new stage, confetti every ten, and the moment a record falls. */
function celebrate(state: GameState, world: World, events: GameEvent[]): void {
  const stage = state.score >= STAGE_POTS ? 2 : state.score >= STAGE_MOVERS ? 1 : 0
  if (stage > Math.max(state.stage, state.pending)) {
    state.pending = stage
    if (stage === 1) state.dueMover = true
    else state.duePot = true
  }
  if (state.score % MILESTONE_STEP === 0) {
    throwConfetti(state, world)
    events.push({ type: 'milestone', score: state.score })
  }
  // Only a record from an earlier round is worth announcing mid-flight; the first point ever
  // is not a "new record", it is just the first point.
  if (!state.newBest && state.best > 0 && state.score > state.best) {
    state.newBest = true
    events.push({ type: 'record', score: state.score })
  }
}

function stepParticles(particles: Particle[], dt: number): Particle[] {
  for (const p of particles) {
    p.life -= dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vy += 520 * p.weight * dt
    p.vx *= 1 - 1.2 * dt
  }
  return keep(particles, (p) => p.life > 0)
}

/** Pipe or floor in the way? The ceiling is a wall, not a death — see `advance`. */
export function hasCollision(state: GameState, world: World): boolean {
  if (state.hippoY + HIPPO_RADIUS >= world.groundY) return true
  return state.pipes.some((pipe) => {
    const withinX = world.hippoX + HIPPO_RADIUS > pipe.x && world.hippoX - HIPPO_RADIUS < pipe.x + PIPE_WIDTH
    if (!withinX) return false
    return state.hippoY - HIPPO_RADIUS < pipe.gapY - pipe.half || state.hippoY + HIPPO_RADIUS > pipe.gapY + pipe.half
  })
}

function collect(state: GameState, world: World, now: number, events: GameEvent[]): void {
  const reach = HIPPO_RADIUS + PICKUP_RADIUS
  for (const pickup of state.pickups) {
    if (pickup.taken) continue
    const dx = pickup.x - world.hippoX
    const dy = pickup.y - state.hippoY
    if (dx * dx + dy * dy > reach * reach) continue
    pickup.taken = true
    if (pickup.kind === 'melon') {
      state.melons += 1
      state.score += MELON_POINTS
      burst(state, pickup.x, pickup.y, 14, 'melon', 110, 1)
      state.floaters.push({ kind: 'melon', value: MELON_POINTS, x: pickup.x, y: pickup.y - 6, born: now })
      events.push({ type: 'melon', score: state.score })
      celebrate(state, world, events)
      continue
    }
    state.shields += 1
    state.charges += 1
    state.shieldAt = now
    burst(state, pickup.x, pickup.y, 12, 'bubble', 70, 0)
    state.floaters.push({ kind: 'shield', value: 0, x: pickup.x, y: pickup.y - 6, born: now })
    events.push({ type: 'shield' })
  }
}

/** Ends the round, banking the score. Also called when the player gives up from the pause card. */
export function gameOver(state: GameState, now: number, events: GameEvent[]): void {
  if (state.phase === 'over') return
  state.phase = 'over'
  state.overAt = now
  if (state.score > state.best) {
    state.best = state.score
    state.newBest = true
  }
  events.push({ type: 'crash', score: state.score, best: state.best, newBest: state.newBest })
}

/**
 * Advances one frame. `dt` is already clamped by the caller, `now` is a performance.now() stamp.
 * Anything worth reacting to outside the simulation is appended to `events`.
 */
export function advance(
  state: GameState,
  dt: number,
  now: number,
  world: World,
  difficulty: Difficulty,
  events: GameEvent[],
): void {
  state.particles = stepParticles(state.particles, dt)
  state.confetti = stepConfetti(state.confetti, dt)
  keep(state.floaters, (f) => now - f.born < FLOATER_MS)
  // Knocked out, the hippo stays exactly where it was hit; only the sky reacts.
  if (state.phase !== 'running') return

  const tuning = tuningFor(difficulty, state.score, world)
  state.elapsed += dt

  state.velocity = Math.min(state.velocity + GRAVITY * dt, MAX_FALL_SPEED)
  state.hippoY += state.velocity * dt
  // The ceiling is a lid rather than a wall of death: on a phone an over-eager tap near the top
  // would otherwise end a good run for nothing.
  if (state.hippoY - HIPPO_RADIUS < 0) {
    state.hippoY = HIPPO_RADIUS
    state.velocity = Math.max(state.velocity, 0)
  }

  const dx = tuning.speed * dt
  state.scrolled += dx
  while (state.scrolled >= state.nextSpawn) {
    const overshoot = state.scrolled - state.nextSpawn
    const previous: Anchor = state.pipes.at(-1) ?? { baseY: world.groundY / 2, swing: 0 }
    const moving = state.dueMover || Math.random() < tuning.movers
    state.dueMover = false
    const pipe = makePipe(world, spawnX(world) - overshoot, tuning, previous, moving)
    state.pipes.push(pipe)
    spawnPot(state, world, pipe, tuning, spawnPickup(state, world, pipe, tuning))
    state.nextSpawn += tuning.spacing
  }

  for (const pipe of state.pipes) {
    pipe.x -= dx
    // A mover's gap swings about its base on the round's own clock, so a pause holds it still.
    if (pipe.swing > 0) pipe.gapY = pipe.baseY + pipe.swing * Math.sin(state.elapsed * MOVER_OMEGA + pipe.phase)
    if (state.pending === 1 && pipe.swing > 0 && !pipe.passed && pipe.x - world.hippoX < tuning.speed * NOTICE_LEAD_S) {
      announce(state, 1, events)
    }
    if (pipe.passed || pipe.x + PIPE_WIDTH >= world.hippoX) continue
    pipe.passed = true
    state.pipesCleared += 1
    if (pipe.swing > 0) state.moversPassed += 1
    state.score += 1
    events.push({ type: 'score', score: state.score })
    celebrate(state, world, events)
  }
  keep(state.pipes, (pipe) => pipe.x + PIPE_WIDTH > -10)

  for (const pickup of state.pickups) pickup.x -= dx
  for (const floater of state.floaters) floater.x -= dx
  keep(state.pickups, (p) => !p.taken && p.x > -PICKUP_RADIUS * 2)

  collect(state, world, now, events)
  const struck = stepPots(state, dt, dx, world, tuning, events)

  if (!hasCollision(state, world) && !struck) return
  if (now < state.solidUntil) return
  if (struck) smash(state, struck, struck.y, events)
  if (state.charges > 0) {
    // One bubble takes the hit: it pops, the hippo is nudged clear and stays solid long enough
    // to fly out of the pipe it is standing in.
    state.charges -= 1
    state.saves += 1
    state.solidUntil = now + INVULNERABLE_MS
    state.poppedAt = now
    state.hippoY = Math.min(state.hippoY, world.groundY - HIPPO_RADIUS)
    state.velocity = FLAP_VELOCITY * 0.75
    burst(state, world.hippoX, state.hippoY, 16, 'bubble', 110, 0)
    events.push({ type: 'shield-pop' })
    return
  }
  gameOver(state, now, events)
}
