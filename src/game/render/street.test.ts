import assert from 'node:assert/strict'
import { test } from 'node:test'
import { furnitureAt, furnitureUnder, makeStreet, STREET_PERIOD } from './street.ts'

const HIPPO_X = 80
const { spots } = makeStreet(59)

test('furniture spots are few, far apart and on brick joints', () => {
  const { plants } = makeStreet(59)
  assert.equal(spots.length, 3)
  for (const x of spots) assert.equal(x % 20, 0)
  for (let i = 1; i < spots.length; i++) assert.ok(spots[i] - spots[i - 1] >= 700)
  assert.ok(spots[0] + STREET_PERIOD - spots[spots.length - 1] >= 700)
  for (const plant of plants) for (const x of spots) assert.ok(Math.abs(plant.x - x) >= 34)
})

test('the furniture schedule is deterministic, takes turns, and rarely shows an animal', () => {
  const things = Array.from({ length: 300 }, (_, n) => furnitureAt(n))
  assert.deepEqual(things, Array.from({ length: 300 }, (_, n) => furnitureAt(n)))
  const fixtures = things.filter((t) => t && t.kind !== 'cat' && t.kind !== 'dog').map((t) => t?.kind)
  for (let i = 1; i < fixtures.length; i++) assert.notEqual(fixtures[i], fixtures[i - 1])
  const animals = things.filter((t) => t && (t.kind === 'cat' || t.kind === 'dog')).length
  assert.ok(animals >= 10 && animals <= 60, `animals: ${animals}`)
  assert.ok(things.some((t) => t?.kind === 'cat') && things.some((t) => t?.kind === 'dog'))
  assert.ok(things.some((t) => t === null))
})

test('a landing finds what stands at the spot, and nothing between the spots', () => {
  let found = 0
  for (const round of [0, 1, 7]) {
    for (const period of [0, 1, 5]) {
      for (const spot of spots) {
        const at = period * STREET_PERIOD + spot
        const on = furnitureUnder(at - HIPPO_X, HIPPO_X, round)
        if (on) found += 1
        assert.equal(furnitureUnder(at - HIPPO_X - 12, HIPPO_X, round), on, 'a step short of the spot')
        assert.equal(furnitureUnder(at - HIPPO_X + 12, HIPPO_X, round), on, 'a step past the spot')
        assert.equal(furnitureUnder(at - HIPPO_X + 200, HIPPO_X, round), null, 'well clear of any spot')
      }
    }
  }
  assert.ok(found > 0, 'the sample must cover occupied spots')
})

test('the spots of one period do not bleed into the next', () => {
  const last = spots[spots.length - 1]
  const first = spots[0]
  const before = furnitureUnder(last - HIPPO_X, HIPPO_X, 0)
  const after = furnitureUnder(STREET_PERIOD + first - HIPPO_X, HIPPO_X, 0)
  assert.equal(furnitureUnder(last - HIPPO_X + 4, HIPPO_X, 0), before)
  assert.equal(furnitureUnder(STREET_PERIOD + first - HIPPO_X - 4, HIPPO_X, 0), after)
})
