import {
  FIREWORK_MAX,
  FIREWORK_STEP,
  FLAP_VELOCITY,
  GAP_MARGIN,
  GRAVITY,
  HIPPO_RADIUS,
  INVULNERABLE_MS,
  MAX_FALL_SPEED,
  MELON_CHANCE,
  MELON_POINTS,
  OVER_TITLES,
  PICKUP_RADIUS,
  PIPE_WIDTH,
  ROCKET_BURST_MS,
  ROCKET_RISE_MS,
  ROCKET_SPACING_MS,
  SHIELD_CHANCE,
  SHIELD_EARLIEST_PIPE,
} from './constants.ts'
import { tuningFor } from './difficulty.ts'
import type { Difficulty, Tuning } from './difficulty.ts'
import type { GameEvent, GameState, Particle, Pipe, Spark, Tint } from './types.ts'
import type { World } from './world.ts'

/** Where a pipe enters the field, just out of sight on the right. */
function spawnX(world: World): number {
  return world.width + PIPE_WIDTH
}

/** A pipe is already on screen at the start, so the ready screen shows what is coming. */
function firstPipeX(world: World): number {
  return Math.round(world.width * 0.82)
}

function randomGapY(world: World, half: number): number {
  const margin = half + GAP_MARGIN
  const range = Math.max(world.groundY - 2 * margin, 0)
  return margin + Math.random() * range
}

function makePipe(world: World, x: number, gap: number): Pipe {
  const half = gap / 2
  return { x, gapY: randomGapY(world, half), half, passed: false }
}

export interface InitOptions {
  world: World
  difficulty: Difficulty
  best: number
  round?: number
}

export function initialState({ world, difficulty, best, round = 0 }: InitOptions): GameState {
  const tuning = tuningFor(difficulty, 0, world)
  const first = makePipe(world, firstPipeX(world), tuning.gap)
  // The first pipe is placed mid-flight, so the spawn counter starts part-way through a cycle.
  const travelled = spawnX(world) - first.x
  return {
    phase: 'ready',
    hippoY: world.groundY / 2,
    velocity: 0,
    pipes: [first],
    pickups: [],
    scrolled: 0,
    nextSpawn: Math.max(tuning.spacing - travelled, 0),
    score: 0,
    pipesCleared: 0,
    melons: 0,
    shields: 0,
    saves: 0,
    shielded: false,
    solidUntil: 0,
    best,
    newBest: false,
    round,
    overTitle: OVER_TITLES[round % OVER_TITLES.length],
    overAt: 0,
    startedAt: 0,
    flappedAt: 0,
    elapsed: 0,
    fireworks: [],
    particles: [],
  }
}

/** One upward beat of the wings. */
export function flap(state: GameState, now: number): void {
  state.velocity = FLAP_VELOCITY
  state.flappedAt = now
}

function spawnPickup(state: GameState, world: World, pipe: Pipe, tuning: Tuning): void {
  const eligible = state.pipesCleared >= SHIELD_EARLIEST_PIPE && !state.shielded
  if (eligible && Math.random() < SHIELD_CHANCE) {
    // A shield sits in the gap the player is aiming for anyway — a reward for precision, not a detour.
    state.pickups.push({
      kind: 'shield',
      x: pipe.x + PIPE_WIDTH / 2,
      y: pipe.gapY,
      taken: false,
      seed: Math.random() * Math.PI * 2,
    })
    return
  }
  if (Math.random() >= MELON_CHANCE) return
  // Melons hang in the open water between two pipes at any height: worth points, worth a detour,
  // and sometimes worth leaving alone.
  const margin = PICKUP_RADIUS + GAP_MARGIN
  state.pickups.push({
    kind: 'melon',
    x: pipe.x + tuning.spacing / 2,
    y: margin + Math.random() * Math.max(world.groundY - 2 * margin, 0),
    taken: false,
    seed: Math.random() * Math.PI * 2,
  })
}

function burst(
  state: GameState,
  x: number,
  y: number,
  count: number,
  tint: Tint,
  speed: number,
  weight: number,
): void {
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

function launchFireworks(state: GameState, world: World, now: number): void {
  const count = Math.min(Math.max(1, Math.floor(state.score / FIREWORK_STEP)), FIREWORK_MAX)
  const total = ROCKET_RISE_MS + ROCKET_BURST_MS
  state.fireworks = state.fireworks.filter((r) => now - r.launchAt < total)
  const sparkCount = 12 + count * 2
  for (let i = 0; i < count; i++) {
    const sparks: Spark[] = Array.from({ length: sparkCount }, (_, k) => ({
      angle: (k / sparkCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3,
      speed: 24 + Math.random() * 20,
      size: 1.3 + Math.random() * 0.9,
    }))
    state.fireworks.push({
      x: 40 + Math.random() * Math.max(world.width - 80, 40),
      drift: (Math.random() < 0.5 ? -1 : 1) * (12 + Math.random() * 16),
      peakY: world.groundY * 0.2 + Math.random() * world.groundY * 0.25,
      launchAt: now + i * ROCKET_SPACING_MS + Math.random() * 100,
      sparks,
    })
  }
}

/** Everything that may follow a point: fireworks every ten, and the moment a record falls. */
function celebrate(state: GameState, world: World, now: number, events: GameEvent[]): void {
  if (state.score % FIREWORK_STEP === 0) {
    launchFireworks(state, world, now)
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
  return particles.filter((p) => p.life > 0)
}

/** Pipe or floor in the way? The ceiling is a wall, not a death — see `advance`. */
export function hasCollision(state: GameState, world: World): boolean {
  if (state.hippoY + HIPPO_RADIUS >= world.groundY) return true
  return state.pipes.some((pipe) => {
    const withinX =
      world.hippoX + HIPPO_RADIUS > pipe.x && world.hippoX - HIPPO_RADIUS < pipe.x + PIPE_WIDTH
    if (!withinX) return false
    return (
      state.hippoY - HIPPO_RADIUS < pipe.gapY - pipe.half ||
      state.hippoY + HIPPO_RADIUS > pipe.gapY + pipe.half
    )
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
      burst(state, pickup.x, pickup.y, 10, 'melon', 90, 1)
      events.push({ type: 'melon', score: state.score })
      celebrate(state, world, now, events)
      continue
    }
    state.shields += 1
    state.shielded = true
    burst(state, pickup.x, pickup.y, 12, 'bubble', 70, 0)
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
    const pipe = makePipe(world, spawnX(world) - overshoot, tuning.gap)
    state.pipes.push(pipe)
    spawnPickup(state, world, pipe, tuning)
    state.nextSpawn += tuning.spacing
  }

  for (const pipe of state.pipes) {
    pipe.x -= dx
    if (pipe.passed || pipe.x + PIPE_WIDTH >= world.hippoX) continue
    pipe.passed = true
    state.pipesCleared += 1
    state.score += 1
    events.push({ type: 'score', score: state.score })
    celebrate(state, world, now, events)
  }
  state.pipes = state.pipes.filter((pipe) => pipe.x + PIPE_WIDTH > -10)

  for (const pickup of state.pickups) pickup.x -= dx
  state.pickups = state.pickups.filter((p) => !p.taken && p.x > -PICKUP_RADIUS * 2)

  collect(state, world, now, events)

  if (!hasCollision(state, world)) return
  if (now < state.solidUntil) return
  if (state.shielded) {
    // The bubble takes the hit: it pops, the hippo is nudged clear and stays solid long enough
    // to fly out of the pipe it is standing in.
    state.shielded = false
    state.saves += 1
    state.solidUntil = now + INVULNERABLE_MS
    state.hippoY = Math.min(state.hippoY, world.groundY - HIPPO_RADIUS)
    state.velocity = FLAP_VELOCITY * 0.75
    burst(state, world.hippoX, state.hippoY, 16, 'bubble', 110, 0)
    events.push({ type: 'shield-pop' })
    return
  }
  burst(state, world.hippoX, state.hippoY, 14, 'dust', 80, 0.6)
  gameOver(state, now, events)
}
