import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MEDALS, medalFor, nextMedal } from './medals.ts'

test('medals are ordered by the score they need', () => {
  for (let i = 1; i < MEDALS.length; i++) assert.ok(MEDALS[i].from > MEDALS[i - 1].from)
})

test('a low score earns nothing, a threshold earns exactly that medal', () => {
  assert.equal(medalFor(0), null)
  assert.equal(medalFor(9), null)
  assert.equal(medalFor(10)?.id, 'bronze')
  assert.equal(medalFor(24)?.id, 'bronze')
  assert.equal(medalFor(25)?.id, 'silver')
  assert.equal(medalFor(50)?.id, 'gold')
  assert.equal(medalFor(100)?.id, 'platinum')
  assert.equal(medalFor(199)?.id, 'platinum')
  assert.equal(medalFor(200)?.id, 'diamond')
  assert.equal(medalFor(1000)?.id, 'diamond')
})

test('the next medal is the first one still out of reach', () => {
  assert.equal(nextMedal(0)?.id, 'bronze')
  assert.equal(nextMedal(10)?.id, 'silver')
  assert.equal(nextMedal(99)?.id, 'platinum')
  assert.equal(nextMedal(100)?.id, 'diamond')
  assert.equal(nextMedal(200), null)
})
