import assert from 'node:assert/strict'
import { test } from 'node:test'
import { STAGE_MOVERS, STAGE_POTS, STAGE_RAMP } from './constants.ts'
import { DIFFICULTIES, difficultyById, tuningFor } from './difficulty.ts'
import { fitWorld } from './world.ts'

const world = fitWorld(390, 780)

test('an unknown id falls back to normal', () => {
  assert.equal(difficultyById('nope' as never).id, 'normal')
})

test('the ramp starts at the opening values and ends at the closing ones', () => {
  const normal = difficultyById('normal')
  const start = tuningFor(normal, 0, world)
  const end = tuningFor(normal, normal.ramp, world)
  assert.equal(start.speed, normal.speed[0])
  assert.equal(end.speed, normal.speed[1])
  assert.equal(end.gap, normal.gap[1])
  assert.equal(end.progress, 1)
})

test('the ramp does not overshoot past its end score', () => {
  const hard = difficultyById('hard')
  const end = tuningFor(hard, hard.ramp, world)
  const later = tuningFor(hard, hard.ramp * 2, world)
  for (const key of ['speed', 'spacing', 'gap', 'jump', 'progress'] as const) assert.equal(later[key], end[key])
})

test('the stages start at their scores, grow denser, and level off', () => {
  const normal = difficultyById('normal')
  const at = (score: number) => tuningFor(normal, score, world)
  assert.equal(at(STAGE_POTS - 1).pots, 0)
  assert.ok(at(STAGE_POTS).pots > 0)
  assert.ok(at(STAGE_POTS + 100).pots > at(STAGE_POTS).pots)
  assert.equal(at(STAGE_POTS + STAGE_RAMP).pots, at(STAGE_POTS + STAGE_RAMP * 3).pots)
  assert.equal(at(STAGE_MOVERS - 1).movers, 0)
  assert.equal(at(STAGE_MOVERS - 1).swing, 0)
  assert.ok(at(STAGE_MOVERS).movers > 0 && at(STAGE_MOVERS).swing > 0)
  assert.ok(at(STAGE_MOVERS + STAGE_RAMP).swing > at(STAGE_MOVERS).swing)
})

test('every difficulty gets faster and tighter, never the reverse', () => {
  for (const difficulty of DIFFICULTIES) {
    assert.ok(difficulty.speed[1] > difficulty.speed[0], difficulty.id)
    assert.ok(difficulty.gap[1] < difficulty.gap[0], difficulty.id)
    assert.ok(difficulty.jump[1] > difficulty.jump[0], difficulty.id)
  }
})

test('the gap never exceeds the field it has to fit in', () => {
  // A short, wide window: the easy gap of 152 would not leave room for the pipes.
  const short = fitWorld(1600, 400)
  const tuning = tuningFor(difficultyById('easy'), 0, short)
  assert.ok(tuning.gap <= short.groundY)
})
