import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import {
  FLAP_VELOCITY,
  GAP_MARGIN,
  HIPPO_RADIUS,
  MAX_SHIELDS,
  MELON_POINTS,
  MELON_REACH,
  MOVER_MIN_JUMP,
  PIPE_WIDTH,
  POT_REST_Y,
  POT_SPACING,
  STAGE_MOVERS,
  STAGE_POTS,
} from './constants.ts'
import { difficultyById, tuningFor } from './difficulty.ts'
import { advance, fallTime, flap, hasCollision, initialState } from './state.ts'
import type { GameEvent, GameState, Pickup, Pipe, Pot } from './types.ts'
import { fitWorld } from './world.ts'

const world = fitWorld(390, 780)
const normal = difficultyById('normal')

function running(): GameState {
  const state = initialState({ world, difficulty: normal, best: 0 })
  state.phase = 'running'
  // Park the spawner far ahead so each test controls the pipes it cares about.
  state.nextSpawn = 100_000
  state.pipes = []
  return state
}

function pipeAt(x: number, gapY: number, half: number, passed = false): Pipe {
  return { x, gapY, half, passed, baseY: gapY, swing: 0, phase: 0 }
}

function potAt(x: number, y: number, lead: number, falling: boolean): Pot {
  return { x, y, vy: falling ? 100 : 0, lead, falling, spin: 0, passed: false, smashed: false, seed: 0 }
}

function step(state: GameState, dt = 1 / 60, now = 1000): GameEvent[] {
  const events: GameEvent[] = []
  advance(state, dt, now, world, normal, events)
  return events
}

test('a fresh round is ready, centred and has one pipe in view', () => {
  const state = initialState({ world, difficulty: normal, best: 7 })
  assert.equal(state.phase, 'ready')
  assert.equal(state.best, 7)
  assert.equal(state.pipes.length, 1)
  assert.ok(state.pipes[0].x < world.width)
  assert.equal(state.score, 0)
})

test('nothing moves until the round is running', () => {
  const state = initialState({ world, difficulty: normal, best: 0 })
  const before = state.hippoY
  step(state)
  assert.equal(state.hippoY, before)
})

test('gravity pulls the hippo down and a flap sends it up', () => {
  const state = running()
  const start = state.hippoY
  step(state)
  assert.ok(state.hippoY > start)
  flap(state, 1000)
  assert.equal(state.velocity, FLAP_VELOCITY)
  const afterFlap = state.hippoY
  step(state)
  assert.ok(state.hippoY < afterFlap)
})

test('the ceiling stops the hippo instead of ending the round', () => {
  const state = running()
  state.hippoY = 4
  state.velocity = -600
  const events = step(state)
  assert.equal(state.hippoY, HIPPO_RADIUS)
  assert.equal(state.phase, 'running')
  assert.equal(events.length, 0)
})

test('passing a pipe scores a point exactly once', () => {
  const state = running()
  state.pipes = [pipeAt(world.hippoX - PIPE_WIDTH + 1, state.hippoY, 80)]
  const events = step(state)
  assert.equal(state.score, 1)
  assert.equal(state.pipesCleared, 1)
  assert.deepEqual(events, [{ type: 'score', score: 1 }])
  step(state)
  assert.equal(state.score, 1)
})

test('the floor ends the round and banks a new record', () => {
  const state = running()
  state.score = 5
  state.hippoY = world.groundY - HIPPO_RADIUS + 1
  const events = step(state)
  assert.equal(state.phase, 'over')
  assert.equal(state.best, 5)
  assert.equal(state.newBest, true)
  assert.deepEqual(events.at(-1), { type: 'crash', score: 5, best: 5, newBest: true })
})

test('a score below the record leaves the record alone', () => {
  const state = running()
  state.best = 20
  state.score = 3
  state.hippoY = world.groundY
  step(state)
  assert.equal(state.best, 20)
  assert.equal(state.newBest, false)
})

test('a shield absorbs one hit and keeps the round alive', () => {
  const state = running()
  state.charges = 1
  state.pipes = [pipeAt(world.hippoX - 4, 0, 10, true)]
  const events = step(state)
  assert.equal(state.phase, 'running')
  assert.equal(state.charges, 0)
  assert.equal(state.saves, 1)
  assert.ok(events.some((event) => event.type === 'shield-pop'))
  assert.ok(state.solidUntil > 1000)
})

test('the hippo stays solid for a moment after the shield pops', () => {
  const state = running()
  state.solidUntil = 2000
  state.pipes = [pipeAt(world.hippoX - 4, 0, 10, true)]
  assert.equal(hasCollision(state, world), true)
  step(state, 1 / 60, 1500)
  assert.equal(state.phase, 'running')
})

test('a melon is worth its points and is collected only once', () => {
  const state = running()
  state.pickups = [{ kind: 'melon', x: world.hippoX, y: state.hippoY, taken: false, seed: 0 }]
  const events = step(state)
  assert.equal(state.score, MELON_POINTS)
  assert.equal(state.melons, 1)
  assert.ok(events.some((event) => event.type === 'melon'))
  step(state)
  assert.equal(state.melons, 1)
})

test('shield pickups stack, one charge each', () => {
  const state = running()
  state.charges = 1
  state.pickups = [{ kind: 'shield', x: world.hippoX, y: state.hippoY, taken: false, seed: 0 }]
  const events = step(state)
  assert.equal(state.charges, 2)
  assert.equal(state.shields, 1)
  assert.ok(events.some((event) => event.type === 'shield'))
})

/**
 * Runs the spawner for a while with the hippo out of harm's way (held mid-field and made solid):
 * every pipe is recorded as it appears, every melon with the gap of the pipe it was spawned
 * with, every pot with the slot it stands in. Starting at `score` puts the later stages in play.
 */
function surveySpawns(frames: number, score = 0) {
  const state = initialState({ world, difficulty: normal, best: 0 })
  state.phase = 'running'
  state.pipes = []
  state.score = score
  state.solidUntil = Number.MAX_SAFE_INTEGER
  const seen = new Set<Pipe>()
  const seenPickups = new Set<Pickup>()
  const seenPots = new Set<Pot>()
  const spawns: { at: number; gapY: number; half: number; baseY: number; swing: number; score: number }[] = []
  const melons: { y: number; gapY: number }[] = []
  const pots: { lead: number; slot: number; score: number }[] = []
  for (let i = 0; i < frames; i++) {
    state.hippoY = world.groundY / 2
    state.velocity = 0
    step(state, 1 / 60, 1000 + i * 16)
    for (const pipe of state.pipes) {
      if (seen.has(pipe)) continue
      seen.add(pipe)
      spawns.push({ at: state.scrolled, gapY: pipe.gapY, half: pipe.half, baseY: pipe.baseY, swing: pipe.swing, score: state.score })
    }
    for (const pickup of state.pickups) {
      if (seenPickups.has(pickup)) continue
      seenPickups.add(pickup)
      // Measured from the pipe's resting centre: a mover's gap may already have swung by now
      if (pickup.kind === 'melon') melons.push({ y: pickup.y, gapY: spawns[spawns.length - 1].baseY })
    }
    for (const pot of state.pots) {
      if (seenPots.has(pot)) continue
      seenPots.add(pot)
      pots.push({ lead: pot.lead, slot: spawns.length - 1, score: state.score })
    }
  }
  return { state, spawns, melons, pots }
}

test('pots and moving pipes wait for their stages', () => {
  const { spawns, pots } = surveySpawns(1500)
  assert.ok(spawns.some((s) => s.score < STAGE_POTS), 'the survey must start before the pot stage')
  for (const pot of pots) assert.ok(pot.score >= STAGE_POTS, `a pot at ${pot.score} points`)
  for (const s of spawns) if (s.swing > 0) assert.ok(s.score >= STAGE_MOVERS, `a mover at ${s.score} points`)
})

test('from the pot stage, pots come at a spacing and fall within the field', () => {
  const { pots } = surveySpawns(3000, STAGE_POTS)
  assert.ok(pots.length >= 3, `pots: ${pots.length}`)
  for (const pot of pots) assert.ok(pot.lead > 0.1 && pot.lead < fallTime(world.groundY), `lead ${pot.lead}`)
  for (let i = 1; i < pots.length; i++) assert.ok(pots[i].slot - pots[i - 1].slot >= POT_SPACING)
})

test('a pot lets go on its own and crosses the hippo at the height it was aimed at', () => {
  const state = running()
  state.score = STAGE_POTS
  const aimY = 400
  const lead = fallTime(aimY - POT_REST_Y)
  const { speed } = tuningFor(normal, state.score, world)
  state.pots = [potAt(world.hippoX + speed * (lead + 0.5), POT_REST_Y, lead, false)]
  let closest = Infinity
  let crossedAt = 0
  for (let i = 0; i < 240; i++) {
    state.hippoY = 100
    state.velocity = 0
    step(state, 1 / 60, 1000 + i * 16)
    const pot = state.pots[0]
    if (!pot) break
    const away = Math.abs(pot.x - world.hippoX)
    if (away < closest) {
      closest = away
      crossedAt = pot.y
    }
  }
  assert.ok(closest < 4, `closest approach ${closest}`)
  assert.ok(Math.abs(crossedAt - aimY) < 12, `crossed at ${crossedAt}, aimed at ${aimY}`)
  assert.equal(state.potsDodged, 1)
})

test('a falling pot knocks the hippo out, and a shield takes the hit instead', () => {
  for (const charges of [0, 1]) {
    const state = running()
    state.charges = charges
    state.pots = [potAt(world.hippoX, state.hippoY - 5, 0, true)]
    const events = step(state)
    if (charges === 0) {
      assert.equal(state.phase, 'over')
    } else {
      assert.equal(state.phase, 'running')
      assert.equal(state.charges, 0)
      assert.ok(state.pots.every((pot) => pot.smashed))
      assert.ok(events.some((event) => event.type === 'shield-pop'))
      assert.ok(events.some((event) => event.type === 'smash'))
    }
  }
})

test('moving pipes keep their whole swing in the field and within the jump of their neighbours', () => {
  const { spawns } = surveySpawns(3000, STAGE_MOVERS)
  const movers = spawns.filter((s) => s.swing > 0)
  assert.ok(movers.length >= 3, `movers: ${movers.length}`)
  for (const [i, s] of spawns.entries()) {
    assert.ok(s.baseY - s.swing - s.half >= GAP_MARGIN - 1e-9)
    assert.ok(s.baseY + s.swing + s.half <= world.groundY - GAP_MARGIN + 1e-9)
    if (i === 0) continue
    const prev = spawns[i - 1]
    assert.ok(Math.abs(s.baseY - prev.baseY) + s.swing + prev.swing <= normal.jump[1] + MOVER_MIN_JUMP + 1e-9)
  }
})

test('reaching a stage announces it once', () => {
  const state = running()
  state.score = STAGE_POTS - 1
  state.pipes = [pipeAt(world.hippoX - PIPE_WIDTH + 1, state.hippoY, 80)]
  const events = step(state)
  assert.equal(state.score, STAGE_POTS)
  assert.equal(state.stage, 1)
  assert.ok(events.some((event) => event.type === 'stage' && event.stage === 1))
  assert.ok(!step(state).some((event) => event.type === 'stage'))
})

test('melons hang within reach of the gap they are spawned with', () => {
  const { melons } = surveySpawns(3000)
  assert.ok(melons.length >= 5, `melons seen: ${melons.length}`)
  for (const { y, gapY } of melons) {
    assert.ok(Math.abs(y - gapY) <= normal.jump[1] * MELON_REACH + 1e-9, `melon at ${y} for a gap at ${gapY}`)
    assert.ok(y > 0 && y < world.groundY)
  }
})

test('pipes keep spawning within the difficulty spacing range', () => {
  const { spawns } = surveySpawns(1200)
  assert.ok(spawns.length > 5, `expected several pipes, got ${spawns.length}`)
  // A spawn is noticed on the frame after it is due, so a frame's travel is the tolerance.
  const slack = normal.speed[1] / 60
  for (let i = 1; i < spawns.length; i++) {
    const gap = spawns[i].at - spawns[i - 1].at
    assert.ok(gap >= normal.spacing[0] - slack, `spacing ${gap} below the opening value`)
    assert.ok(gap <= normal.spacing[1] + slack, `spacing ${gap} above the closing value`)
  }
})

test('every gap is reachable: inside the field, clear of ceiling and ground', () => {
  const { spawns } = surveySpawns(1800)
  assert.ok(spawns.length > 5)
  for (const spawn of spawns) {
    assert.ok(spawn.gapY - spawn.half > 0, 'gap top inside the field')
    assert.ok(spawn.gapY + spawn.half < world.groundY, 'gap bottom above the ground')
  }
})

test('a record from an earlier round is announced the moment it falls, and only once', () => {
  const state = running()
  state.best = 1
  state.pipes = [
    pipeAt(world.hippoX - PIPE_WIDTH + 1, state.hippoY, 80),
    pipeAt(world.hippoX - PIPE_WIDTH + 1, state.hippoY, 80),
  ]
  const events = step(state)
  assert.equal(state.score, 2)
  assert.equal(state.newBest, true)
  assert.equal(events.filter((event) => event.type === 'record').length, 1)
})

test('the first points ever are not a mid-flight record', () => {
  const state = running()
  state.best = 0
  state.pipes = [pipeAt(world.hippoX - PIPE_WIDTH + 1, state.hippoY, 80)]
  const events = step(state)
  assert.equal(state.newBest, false)
  assert.ok(!events.some((event) => event.type === 'record'))
  // …but at the end of the round they still count as one.
  state.hippoY = world.groundY
  step(state)
  assert.equal(state.newBest, true)
})

test('a shield only spawns once a few pipes are cleared and the stack is not full', () => {
  // Math.random at zero: every chance roll succeeds, every position lands at its minimum.
  mock.method(Math, 'random', () => 0)
  try {
    const early = running()
    early.nextSpawn = early.scrolled
    step(early)
    assert.equal(early.pickups.length, 1)
    assert.equal(early.pickups[0].kind, 'melon', 'too early for a shield')

    const later = running()
    later.pipesCleared = 5
    later.nextSpawn = later.scrolled
    step(later)
    assert.equal(later.pickups[0].kind, 'shield')

    const armed = running()
    armed.pipesCleared = 5
    armed.charges = MAX_SHIELDS
    armed.nextSpawn = armed.scrolled
    step(armed)
    assert.equal(armed.pickups[0].kind, 'melon', 'no shield beyond the stack limit')
  } finally {
    mock.restoreAll()
  }
})

test('knocked out, the hippo stays exactly where it was hit', () => {
  const state = running()
  state.pipes = [pipeAt(world.hippoX - 4, 0, 10, true)]
  state.hippoY = 100
  state.velocity = 0
  step(state)
  assert.equal(state.phase, 'over')
  const restingAt = state.hippoY
  for (let i = 0; i < 120; i++) step(state, 1 / 60, 2000 + i * 16)
  assert.equal(state.hippoY, restingAt)
  assert.equal(state.particles.length, 0, 'no dust on a crash')
})

/** Lets the spawner run without the hippo dying, and without touching the pipes it makes. */
function gapSequence(field: ReturnType<typeof fitWorld>, frames: number): number[] {
  const state = initialState({ world: field, difficulty: normal, best: 0 })
  state.phase = 'running'
  state.solidUntil = Number.MAX_SAFE_INTEGER
  const seen = new Set<Pipe>()
  const gaps: number[] = []
  for (let i = 0; i < frames; i++) {
    const events: GameEvent[] = []
    advance(state, 1 / 60, 1000 + i * 16, field, normal, events)
    for (const pipe of state.pipes) {
      if (seen.has(pipe)) continue
      seen.add(pipe)
      gaps.push(pipe.gapY)
    }
  }
  return gaps
}

test('consecutive gaps never jump further than the difficulty allows, on any screen', () => {
  for (const field of [fitWorld(390, 844), fitWorld(1440, 900), fitWorld(320, 2000)]) {
    const gaps = gapSequence(field, 2400)
    assert.ok(gaps.length > 10, 'enough pipes to judge')
    for (let i = 1; i < gaps.length; i++) {
      const jump = Math.abs(gaps[i] - gaps[i - 1])
      assert.ok(jump <= normal.jump[1] + 1e-6, `jump of ${jump.toFixed(1)} on a ${field.height}-tall field`)
    }
  }
})

test('the opening gap is within reach of where the hippo starts', () => {
  for (let i = 0; i < 50; i++) {
    const field = fitWorld(390, 844)
    const state = initialState({ world: field, difficulty: normal, best: 0 })
    assert.ok(Math.abs(state.pipes[0].gapY - field.groundY / 2) <= normal.jump[0] + 1e-6)
  }
})
