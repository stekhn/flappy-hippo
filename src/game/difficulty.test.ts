import assert from 'node:assert/strict'
import { test } from 'node:test'
import { STAGE_MOVERS, STAGE_POTS, TOP_SCORE } from './constants.ts'
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

test('after the opening ramp the long ramp keeps tightening, and holds from the top', () => {
  const hard = difficultyById('hard')
  const end = tuningFor(hard, hard.ramp, world)
  const later = tuningFor(hard, hard.ramp * 3, world)
  const top = tuningFor(hard, TOP_SCORE, world)
  const beyond = tuningFor(hard, TOP_SCORE * 4, world)
  assert.equal(end.late, 0)
  assert.ok(later.speed > end.speed && later.speed < top.speed)
  assert.ok(later.gap < end.gap && later.gap > top.gap)
  assert.equal(later.jump, end.jump)
  // Pipes come a little more often at the top, not just faster.
  assert.ok(top.spacing / top.speed < end.spacing / end.speed)
  assert.ok(top.speed < end.speed * 1.25 && top.gap > end.gap * 0.9)
  assert.deepEqual(beyond, top)
})

test('the stages start at their scores, grow denser, and level off', () => {
  const normal = difficultyById('normal')
  const at = (score: number) => tuningFor(normal, score, world)
  assert.equal(at(STAGE_POTS - 1).pots, 0)
  assert.ok(at(STAGE_POTS).pots > 0)
  assert.ok(at(STAGE_POTS + 100).pots > at(STAGE_POTS).pots)
  assert.equal(at(TOP_SCORE).pots, at(TOP_SCORE * 3).pots)
  assert.equal(at(STAGE_MOVERS - 1).movers, 0)
  assert.equal(at(STAGE_MOVERS - 1).swing, 0)
  assert.ok(at(STAGE_MOVERS).movers > 0 && at(STAGE_MOVERS).swing > 0)
  assert.ok(at(TOP_SCORE).swing > at(STAGE_MOVERS).swing)
  assert.ok(STAGE_MOVERS < STAGE_POTS && STAGE_POTS < TOP_SCORE)
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
