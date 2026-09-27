import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import { FLAP_VELOCITY, HIPPO_RADIUS, MELON_POINTS, PIPE_WIDTH } from './constants.ts'
import { difficultyById } from './difficulty.ts'
import { advance, flap, hasCollision, initialState } from './state.ts'
import type { GameEvent, GameState, Pipe } from './types.ts'
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
  state.pipes = [{ x: world.hippoX - PIPE_WIDTH + 1, gapY: state.hippoY, half: 80, passed: false }]
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
  state.shielded = true
  state.pipes = [{ x: world.hippoX - 4, gapY: 0, half: 10, passed: true }]
  const events = step(state)
  assert.equal(state.phase, 'running')
  assert.equal(state.shielded, false)
  assert.equal(state.saves, 1)
  assert.ok(events.some((event) => event.type === 'shield-pop'))
  assert.ok(state.solidUntil > 1000)
})

test('the hippo stays solid for a moment after the shield pops', () => {
  const state = running()
  state.solidUntil = 2000
  state.pipes = [{ x: world.hippoX - 4, gapY: 0, half: 10, passed: true }]
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

test('a shield pickup arms the hippo', () => {
  const state = running()
  state.pickups = [{ kind: 'shield', x: world.hippoX, y: state.hippoY, taken: false, seed: 0 }]
  const events = step(state)
  assert.equal(state.shielded, true)
  assert.equal(state.shields, 1)
  assert.ok(events.some((event) => event.type === 'shield'))
})

/**
 * Runs the spawner for a while with the hippo out of harm's way: every pipe is recorded as it
 * appears, then widened and re-centred so the round keeps going and the survey stays honest.
 */
function surveySpawns(frames: number) {
  const state = initialState({ world, difficulty: normal, best: 0 })
  state.phase = 'running'
  state.pipes = []
  const seen = new Set<Pipe>()
  const spawns: { at: number; gapY: number; half: number }[] = []
  for (let i = 0; i < frames; i++) {
    state.hippoY = world.groundY / 2
    state.velocity = 0
    step(state, 1 / 60, 1000 + i * 16)
    for (const pipe of state.pipes) {
      if (seen.has(pipe)) continue
      seen.add(pipe)
      spawns.push({ at: state.scrolled, gapY: pipe.gapY, half: pipe.half })
      pipe.gapY = state.hippoY
      pipe.half = 150
    }
  }
  return { state, spawns }
}

test('pipes keep spawning within the difficulty spacing range', () => {
  const { spawns } = surveySpawns(1200)
  assert.ok(spawns.length > 5, `expected several pipes, got ${spawns.length}`)
  for (let i = 1; i < spawns.length; i++) {
    const gap = spawns[i].at - spawns[i - 1].at
    assert.ok(gap >= normal.spacing[0] - 1, `spacing ${gap} below the opening value`)
    assert.ok(gap <= normal.spacing[1] + 1, `spacing ${gap} above the closing value`)
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
    { x: world.hippoX - PIPE_WIDTH + 1, gapY: state.hippoY, half: 80, passed: false },
    { x: world.hippoX - PIPE_WIDTH + 1, gapY: state.hippoY, half: 80, passed: false },
  ]
  const events = step(state)
  assert.equal(state.score, 2)
  assert.equal(state.newBest, true)
  assert.equal(events.filter((event) => event.type === 'record').length, 1)
})

test('the first points ever are not a mid-flight record', () => {
  const state = running()
  state.best = 0
  state.pipes = [{ x: world.hippoX - PIPE_WIDTH + 1, gapY: state.hippoY, half: 80, passed: false }]
  const events = step(state)
  assert.equal(state.newBest, false)
  assert.ok(!events.some((event) => event.type === 'record'))
  // …but at the end of the round they still count as one.
  state.hippoY = world.groundY
  step(state)
  assert.equal(state.newBest, true)
})

test('a shield only spawns once a few pipes are cleared and none is held', () => {
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
    armed.shielded = true
    armed.nextSpawn = armed.scrolled
    step(armed)
    assert.equal(armed.pickups[0].kind, 'melon', 'no second shield while one is held')
  } finally {
    mock.restoreAll()
  }
})
