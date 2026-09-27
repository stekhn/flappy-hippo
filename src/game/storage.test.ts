import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ACHIEVEMENTS, newlyUnlocked, unlock } from './achievements.ts'
import { emptyProgress, parseProgress, recordRun } from './storage.ts'
import type { RunResult } from './storage.ts'

const run: RunResult = {
  score: 12,
  pipes: 9,
  melons: 1,
  shields: 1,
  saves: 1,
  seconds: 31.5,
  pots: 3,
  movers: 2,
  difficulty: 'normal',
  night: false,
}

test('nothing saved yet reads as an empty record', () => {
  const progress = parseProgress(null)
  assert.deepEqual(progress, emptyProgress())
})

test('a best score from the first prototype still counts', () => {
  const progress = parseProgress(null, '42')
  assert.equal(progress.best.normal, 42)
})

test('malformed storage never throws', () => {
  for (const raw of ['', '{', 'null', '[]', '"nope"', '{"best":5}']) {
    const progress = parseProgress(raw)
    assert.equal(progress.version, 1)
    assert.equal(typeof progress.best.normal, 'number')
  }
})

test('unknown and missing fields fall back instead of leaking through', () => {
  const progress = parseProgress(
    JSON.stringify({
      best: { normal: 'ten', hard: 3 },
      stats: { games: 4 },
      scores: [{ score: 9, difficulty: 'impossible', at: 1 }, 'junk'],
      achievements: { ten: 1700000000000 },
    }),
  )
  assert.equal(progress.best.normal, 0)
  assert.equal(progress.best.hard, 3)
  assert.equal(progress.stats.games, 4)
  assert.equal(progress.stats.melons, 0)
  assert.deepEqual(progress.scores, [{ score: 9, difficulty: 'normal', melons: 0, at: 1 }])
  assert.equal(progress.achievements.ten, 1700000000000)
})

test('a finished round lands in the stats, the record and the table', () => {
  const after = recordRun(emptyProgress(), run, 1000)
  assert.equal(after.best.normal, 12)
  assert.equal(after.stats.games, 1)
  assert.equal(after.stats.points, 12)
  assert.equal(after.stats.saves, 1)
  assert.equal(after.stats.seconds, 31.5)
  assert.equal(after.stats.pots, 3)
  assert.equal(after.stats.potsRun, 3)
  assert.equal(after.stats.moversRun, 2)
  assert.deepEqual(after.scores, [{ score: 12, difficulty: 'normal', melons: 1, at: 1000 }])
})

test('a weaker round adds to the stats but not to the record', () => {
  const first = recordRun(emptyProgress(), run, 1000)
  const second = recordRun(first, { ...run, score: 3 }, 2000)
  assert.equal(second.best.normal, 12)
  assert.equal(second.stats.games, 2)
  assert.equal(second.scores[0].score, 12)
  assert.equal(second.scores[1].score, 3)
})

test('records are kept per difficulty', () => {
  const normal = recordRun(emptyProgress(), run, 1000)
  const hard = recordRun(normal, { ...run, score: 4, difficulty: 'hard' }, 2000)
  assert.equal(hard.best.normal, 12)
  assert.equal(hard.best.hard, 4)
  assert.equal(hard.best.easy, 0)
})

test('a round without a single point is not worth a table entry', () => {
  const after = recordRun(emptyProgress(), { ...run, score: 0 }, 1000)
  assert.equal(after.scores.length, 0)
  assert.equal(after.stats.games, 1)
})

test('the score table keeps the ten best', () => {
  let progress = emptyProgress()
  for (let i = 1; i <= 15; i++) progress = recordRun(progress, { ...run, score: i }, i)
  assert.equal(progress.scores.length, 10)
  assert.equal(progress.scores[0].score, 15)
  assert.equal(progress.scores.at(-1)!.score, 6)
})

test('achievements unlock once and stay unlocked', () => {
  const progress = recordRun(emptyProgress(), run, 1000)
  const ids = newlyUnlocked(progress)
  assert.ok(ids.includes('first-flight'))
  assert.ok(ids.includes('ten'))
  assert.ok(ids.includes('saved'))
  assert.ok(!ids.includes('century'))

  const unlocked = unlock(progress, ids, 1000)
  assert.deepEqual(newlyUnlocked(unlocked), [])
  assert.equal(unlocked.achievements['ten'], 1000)
})

test('every achievement has an id, a label and a hint', () => {
  const ids = new Set(ACHIEVEMENTS.map((a) => a.id))
  assert.equal(ids.size, ACHIEVEMENTS.length)
  for (const achievement of ACHIEVEMENTS) {
    assert.ok(achievement.label.length > 0, achievement.id)
    assert.ok(achievement.hint.length > 0, achievement.id)
    assert.equal(achievement.reached(emptyProgress()), false, achievement.id)
  }
})
