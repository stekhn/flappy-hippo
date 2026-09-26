import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAX_ASPECT, SHORT_SIDE } from './constants.ts'
import { canvasSize, fitWorld } from './world.ts'

test('a portrait phone keeps the short side and grows downwards', () => {
  const world = fitWorld(390, 780)
  assert.equal(world.width, SHORT_SIDE)
  assert.equal(world.height, SHORT_SIDE * 2)
  assert.ok(world.groundY < world.height)
})

test('a landscape window keeps the short side and grows sideways', () => {
  const world = fitWorld(800, 450)
  assert.equal(world.height, SHORT_SIDE)
  assert.equal(world.width, Math.round((SHORT_SIDE * 800) / 450))
})

test('an extreme aspect ratio stops stretching at the cap', () => {
  const world = fitWorld(320, 2000)
  assert.equal(world.height, Math.round(SHORT_SIDE * MAX_ASPECT))
})

test('the hippo stays a fixed distance from the left edge, within bounds', () => {
  const narrow = fitWorld(320, 700)
  const wide = fitWorld(2400, 400)
  assert.ok(narrow.hippoX >= 62 && narrow.hippoX <= 116)
  assert.ok(wide.hippoX <= 116)
})

test('the canvas fits inside its box without overflowing either side', () => {
  const world = fitWorld(390, 780)
  const size = canvasSize(world, 390, 780)
  assert.ok(size.width <= 390 + 0.001)
  assert.ok(size.height <= 780 + 0.001)
  // Same aspect ratio as the world, so nothing is squashed.
  assert.ok(Math.abs(size.width / size.height - world.width / world.height) < 1e-9)
})

test('a degenerate box does not produce NaN', () => {
  const world = fitWorld(0, 0)
  assert.ok(Number.isFinite(world.width) && Number.isFinite(world.height))
})
