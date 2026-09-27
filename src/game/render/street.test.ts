import assert from 'node:assert/strict'
import { test } from 'node:test'
import { furnitureAt, makeStreet, STREET_PERIOD } from './street.ts'

test('furniture spots are few, far apart and on brick joints', () => {
  const { spots, plants } = makeStreet(59)
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
