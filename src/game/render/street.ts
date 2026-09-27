import { BRICK_WIDTH, OUTLINE, SCENE_PERIOD } from '../constants.ts'
import { mix } from '../palette.ts'
import type { Palette } from '../types.ts'
import { seeded } from './scenery.ts'

/** How far above the ground line the tallest plant on the street reaches (a tall tuft, full size). */
export const STREET_ABOVE = 26
/**
 * The street repeats four times less often than the rest of the scene, so its plants never
 * visibly come round.
 */
export const STREET_PERIOD = SCENE_PERIOD * 4

// The foreground: what stands on the wall and scrolls with it. A small vocabulary of plants and
// litter, all rooted in the joints between the top row's bricks (the scene repeats on a multiple
// of the brick width, so they stay in the cracks however far the wall has scrolled), baked into
// the wall's strip; and, drawn live and far apart, the street furniture. All in the same outlined
// style as the hippo and the pipes and in their colours, and sparse: the hippo and the pipes are
// the show, this is the set dressing.

type Plant = 'tuft' | 'tall' | 'clover' | 'dandelion' | 'buttercups' | 'can' | 'paper'
type Furniture = 'bench' | 'postbox' | 'bin' | 'cat' | 'dog'

interface Blade {
  dx: number
  h: number
  lean: number
  w: number
  lit: boolean
}

interface Prop {
  kind: Plant
  x: number
  blades: Blade[]
  /** Per-prop variation: a tilt, a stalk height. */
  seed: number
  /** …and for plants, a flip, a size and a shade warmer or cooler, so no two are the same. */
  mirror: boolean
  scale: number
  tone: number
}

interface Street {
  plants: Prop[]
  /** Where along a period the furniture stands; the plants keep clear of these. */
  spots: number[]
}

/** How often each plant (or bit of litter) turns up along the joints. */
const WEIGHTS: [Plant, number][] = [
  ['tuft', 30],
  ['tall', 12],
  ['clover', 12],
  ['dandelion', 10],
  ['buttercups', 8],
  ['can', 3],
  ['paper', 3],
]

/** Furniture spots per period, and how far apart they must be. */
const SPOTS_PER_PERIOD = 3
const SPOT_GAP = 700
/** Room a plant leaves around a spot. */
const SPOT_CLEARANCE = 34
/** How often a spot stays empty, and how often what stands there is an animal, not a fixture. */
const EMPTY_CHANCE = 0.25
const ANIMAL_CHANCE = 0.12
/** The fixtures take turns, so no two alike stand next to each other. */
const FIXTURES: Furniture[] = ['bench', 'postbox', 'bin']
/**
 * Each round starts this many spots further along the schedule (further than any round gets),
 * so the scroll resetting does not make every round the same street.
 */
const ROUND_STRIDE = 89

function pick(rnd: () => number): Plant {
  const total = WEIGHTS.reduce((sum, [, w]) => sum + w, 0)
  let roll = rnd() * total
  for (const [kind, weight] of WEIGHTS) {
    roll -= weight
    if (roll <= 0) return kind
  }
  return 'tuft'
}

function makeBlades(rnd: () => number, count: number, tall: boolean): Blade[] {
  return Array.from({ length: count }, (_, k) => {
    const spread = k - (count - 1) / 2
    return {
      dx: spread * (tall ? 2.6 : 2) + (rnd() - 0.5) * 1.2,
      h: tall ? 13 + rnd() * 8 : 6 + rnd() * 7,
      lean: spread * 0.22 + (rnd() - 0.5) * 0.9,
      w: tall ? 1.2 + rnd() * 0.6 : 1.3 + rnd() * 1,
      lit: rnd() > 0.45,
    }
  })
}

export function makeStreet(seed: number): Street {
  const rnd = seeded(seed)

  // The furniture spots first: a handful per period, well apart, on a joint like everything else.
  const spots: number[] = []
  let guard = 0
  while (spots.length < SPOTS_PER_PERIOD && guard++ < 200) {
    const x = Math.round((rnd() * STREET_PERIOD) / BRICK_WIDTH) * BRICK_WIDTH
    if (spots.every((s) => Math.abs(s - x) >= SPOT_GAP && Math.abs(s - x) <= STREET_PERIOD - SPOT_GAP)) spots.push(x)
  }
  spots.sort((a, b) => a - b)

  // Then the plants along the joints, leaving room around the spots.
  const plants: Prop[] = []
  const joints = STREET_PERIOD / BRICK_WIDTH
  let joint = 1
  while (joint < joints) {
    const x = joint * BRICK_WIDTH
    joint += 3 + Math.floor(rnd() * 3)
    if (spots.some((s) => Math.abs(s - x) < SPOT_CLEARANCE)) continue
    const kind = pick(rnd)
    const plant = kind !== 'can' && kind !== 'paper'
    plants.push({
      kind,
      x,
      blades: kind === 'tuft' || kind === 'tall' ? makeBlades(rnd, kind === 'tall' ? 3 + Math.floor(rnd() * 2) : 4 + Math.floor(rnd() * 4), kind === 'tall') : [],
      seed: rnd(),
      mirror: rnd() < 0.5,
      scale: plant ? 0.85 + rnd() * 0.35 : 1,
      tone: plant ? rnd() * 0.4 : 0,
    })
  }
  return { plants, spots }
}

const STREET = makeStreet(59)

/** Offsets at which a thing must be painted so it also shows where the strip wraps. */
const WRAPS = [-STREET_PERIOD, 0, STREET_PERIOD]

/**
 * Paints one full period of the street's plants onto a strip (see layers.ts), ground line at
 * `ground`. Called once per bake, never per frame, so nothing here needs to be cheap.
 */
export function paintStreet(ctx: CanvasRenderingContext2D, p: Palette, ground: number): void {
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const prop of STREET.plants) {
    // A plant's own greens: the palette's, nudged warmer or cooler for this one instance.
    const tinted: Palette =
      prop.tone > 0
        ? {
            ...p,
            grassLit: mix(p.grassLit, p.grassShade, prop.tone * 0.6),
            grassShade: mix(p.grassShade, p.bushEdge, prop.tone * 0.5),
          }
        : p
    for (const base of WRAPS) {
      const x = prop.x + base
      if (x < -30 || x > STREET_PERIOD + 30) continue
      // Everything roots in an opened joint
      ctx.fillStyle = p.groundLine
      ctx.fillRect(x - 1.5, ground, 3, 6)
      ctx.save()
      ctx.translate(x, ground)
      ctx.scale(prop.mirror ? -prop.scale : prop.scale, prop.scale)
      switch (prop.kind) {
        case 'tuft':
        case 'tall':
          drawBlades(ctx, tinted, 0, 0, prop.blades)
          break
        case 'clover':
          drawClover(ctx, tinted, 0, 0)
          break
        case 'dandelion':
          drawDandelion(ctx, tinted, 0, 0, prop.seed)
          break
        case 'buttercups':
          drawButtercups(ctx, tinted, 0, 0, prop.seed)
          break
        case 'can':
          drawCan(ctx, p, 0, 0, prop.seed)
          break
        case 'paper':
          drawPaper(ctx, p, 0, 0, prop.seed)
          break
      }
      ctx.restore()
    }
  }
  ctx.restore()
}

/** A number in [0, 1) for the n-th thing, the same every time it is asked for (lowbias32). */
function hash(n: number): number {
  let h = n >>> 0
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d)
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

export interface Thing {
  kind: Furniture
  mirror: boolean
  /** Desyncs the animals' little routines. */
  seed: number
  /** When it first came on screen (seconds), so its routine starts soon after, not on a clock of its own. */
  seenAt?: number
}

/**
 * The things at the spots so far, made up on demand and kept, since the fixtures take turns and
 * a turn depends on what came before. A few hundred entries even in a very long round.
 */
const schedule: (Thing | null)[] = []
let placed = 0

/** What stands at the n-th furniture spot since the start, if anything. */
export function furnitureAt(n: number): Thing | null {
  while (schedule.length <= n) {
    const i = schedule.length
    const roll = hash(i * 3)
    const mirror = hash(i * 3 + 1) < 0.5
    const seed = hash(i * 3 + 2)
    if (roll < EMPTY_CHANCE) schedule.push(null)
    else if (roll < EMPTY_CHANCE + ANIMAL_CHANCE) schedule.push({ kind: roll < EMPTY_CHANCE + ANIMAL_CHANCE / 2 ? 'cat' : 'dog', mirror, seed })
    else schedule.push({ kind: FIXTURES[placed++ % FIXTURES.length], mirror, seed })
  }
  return schedule[n]
}

/** `age`: seconds since the thing came on screen. */
type Draw = (ctx: CanvasRenderingContext2D, p: Palette, x: number, base: number, age: number, seed: number) => void

const DRAW: Record<Furniture, Draw> = {
  bench: drawBench,
  postbox: drawPostbox,
  bin: drawBin,
  cat: drawCat,
  dog: drawDog,
}

/**
 * The street furniture: a bench, a postbox, a bin, now and then a cat or a dog. Drawn live, not
 * baked: only what is on screen is drawn, one or two things at most, and what each spot gets is
 * decided from its number rather than a stored list, so the furniture never comes round.
 * `origin` is the screen x of the strip for period `period`, as blitted; `round` picks the
 * stretch of the schedule this round runs along; `time` (seconds) runs the animals' routines.
 */
export function drawFurniture(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  origin: number,
  period: number,
  round: number,
  width: number,
  ground: number,
  time: number,
): void {
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (let k = Math.max(0, period - 1); origin + (k - period) * STREET_PERIOD < width; k++) {
    for (const [i, spot] of STREET.spots.entries()) {
      const x = origin + (k - period) * STREET_PERIOD + spot
      if (x < -SPOT_CLEARANCE || x > width + SPOT_CLEARANCE) continue
      const thing = furnitureAt(round * ROUND_STRIDE + k * SPOTS_PER_PERIOD + i)
      if (!thing) continue
      ctx.save()
      ctx.translate(x, ground)
      if (thing.mirror) ctx.scale(-1, 1)
      thing.seenAt ??= time
      DRAW[thing.kind](ctx, p, 0, 0, time - thing.seenAt, thing.seed)
      ctx.restore()
    }
  }
  ctx.restore()
}

function drawBlades(ctx: CanvasRenderingContext2D, p: Palette, x: number, base: number, blades: Blade[]): void {
  for (const pass of [false, true]) {
    ctx.strokeStyle = pass ? p.grassLit : p.grassShade
    for (const blade of blades) {
      if (blade.lit !== pass) continue
      ctx.lineWidth = blade.w
      ctx.beginPath()
      ctx.moveTo(x + blade.dx * 0.6, base + 3)
      ctx.quadraticCurveTo(
        x + blade.dx + blade.lean * 2.5,
        base - blade.h * 0.55,
        x + blade.dx + blade.lean * 6,
        base - blade.h,
      )
      ctx.stroke()
    }
  }
}

/** A low clover: three stalks from the joint, each with a small three-leaf head. */
function drawClover(ctx: CanvasRenderingContext2D, p: Palette, x: number, base: number): void {
  ctx.strokeStyle = p.grassShade
  ctx.lineWidth = 1
  const heads: [number, number][] = [
    [-4, 4.5],
    [0.5, 6.5],
    [4.5, 4],
  ]
  for (const [hx, hy] of heads) {
    ctx.beginPath()
    ctx.moveTo(x, base + 2)
    ctx.quadraticCurveTo(x + hx * 0.5, base - hy * 0.5, x + hx, base - hy)
    ctx.stroke()
  }
  for (const [i, [hx, hy]] of heads.entries()) {
    ctx.fillStyle = i === 1 ? p.grassLit : p.grassShade
    ctx.beginPath()
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + (k / 3) * Math.PI * 2
      ctx.moveTo(x + hx + Math.cos(a) * 1.3 + 1.3, base - hy + Math.sin(a) * 1.3)
      ctx.arc(x + hx + Math.cos(a) * 1.3, base - hy + Math.sin(a) * 1.3, 1.3, 0, Math.PI * 2)
    }
    ctx.fill()
  }
}

/** One tall stalk with a pale seed head; two leaves at the foot. */
function drawDandelion(ctx: CanvasRenderingContext2D, p: Palette, x: number, base: number, seed: number): void {
  const h = 12 + seed * 6
  const lean = (seed - 0.5) * 4
  ctx.strokeStyle = p.grassShade
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(x, base + 2)
  ctx.quadraticCurveTo(x + lean * 0.4, base - h * 0.6, x + lean, base - h)
  ctx.stroke()
  // Leaves
  ctx.strokeStyle = p.grassLit
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(x, base + 1)
  ctx.quadraticCurveTo(x - 3, base - 2, x - 5, base - 5)
  ctx.moveTo(x, base + 1)
  ctx.quadraticCurveTo(x + 3, base - 1.5, x + 4.5, base - 4)
  ctx.stroke()
  // The seed head: a soft disc with a ring of seeds
  const hx = x + lean
  const hy = base - h
  ctx.fillStyle = p.flower
  ctx.globalAlpha = 0.85
  ctx.beginPath()
  ctx.arc(hx, hy, 3.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.fillStyle = p.grassShade
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(hx + Math.cos(a) * 2.6, hy + Math.sin(a) * 2.6, 0.5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.beginPath()
  ctx.arc(hx, hy, 0.8, 0, Math.PI * 2)
  ctx.fill()
}

/** Three short stalks with gold cups; the game's reward colour, in miniature. */
function drawButtercups(ctx: CanvasRenderingContext2D, p: Palette, x: number, base: number, seed: number): void {
  const stalks: [number, number][] = [
    [-4, 6 + seed * 3],
    [0.5, 9 + seed * 3],
    [4.5, 7 + seed * 2],
  ]
  ctx.strokeStyle = p.grassShade
  ctx.lineWidth = 1.1
  for (const [sx, sh] of stalks) {
    ctx.beginPath()
    ctx.moveTo(x, base + 2)
    ctx.quadraticCurveTo(x + sx * 0.4, base - sh * 0.5, x + sx, base - sh)
    ctx.stroke()
  }
  ctx.strokeStyle = p.grassLit
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x, base + 1)
  ctx.quadraticCurveTo(x + 3, base - 1, x + 4, base - 3.5)
  ctx.stroke()
  for (const [sx, sh] of stalks) {
    ctx.fillStyle = p.flowerCenter
    ctx.beginPath()
    ctx.arc(x + sx, base - sh, 1.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = p.flower
    ctx.beginPath()
    ctx.arc(x + sx - 0.4, base - sh - 0.4, 0.6, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** A drink can on its side. */
function drawCan(ctx: CanvasRenderingContext2D, p: Palette, x: number, base: number, seed: number): void {
  ctx.save()
  ctx.translate(x, base - 2)
  ctx.rotate((seed - 0.5) * 0.5 + (seed > 0.5 ? Math.PI : 0))
  ctx.lineWidth = OUTLINE
  ctx.strokeStyle = p.hippoDark
  ctx.fillStyle = p.hippoLight
  ctx.beginPath()
  ctx.roundRect(-4, -2.2, 8, 4.4, 1.2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = p.hippoBody
  ctx.fillRect(-1.5, -2.2, 3, 4.4)
  ctx.fillStyle = p.hippoDark
  ctx.beginPath()
  ctx.ellipse(3.6, 0, 0.9, 2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** A crumpled ball of paper. */
function drawPaper(ctx: CanvasRenderingContext2D, p: Palette, x: number, base: number, seed: number): void {
  ctx.save()
  ctx.translate(x, base - 2.4)
  ctx.rotate(seed * Math.PI * 2)
  ctx.lineWidth = OUTLINE
  ctx.strokeStyle = p.hippoDark
  ctx.fillStyle = p.flower
  ctx.beginPath()
  const r = 2.6
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2
    const rr = r * (0.8 + ((k * 7) % 3) * 0.12)
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = p.hippoBody
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.moveTo(-1.5, -0.5)
  ctx.lineTo(0.6, 0.3)
  ctx.lineTo(1.6, -1.2)
  ctx.stroke()
  ctx.restore()
}

/** A park bench: two iron legs, wooden slats, a slatted back. */
function drawBench(ctx: CanvasRenderingContext2D, p: Palette, x: number, base: number): void {
  ctx.lineWidth = OUTLINE
  ctx.strokeStyle = p.hippoDark
  // Legs and back posts
  ctx.fillStyle = p.hippoDark
  for (const lx of [x - 10, x + 10]) {
    ctx.fillRect(lx - 1, base - 9, 2, 9.5)
    ctx.fillRect(lx - 1, base - 18, 2, 9)
  }
  // Seat and back slats
  ctx.fillStyle = p.wood
  for (const [y, w] of [
    [base - 12, 27],
    [base - 9.2, 27],
    [base - 18, 25],
    [base - 15.2, 25],
  ]) {
    ctx.beginPath()
    ctx.roundRect(x - w / 2, y, w, 2.3, 1)
    ctx.fill()
    ctx.stroke()
  }
}

/**
 * A postbox as they are here: a yellow box with a hooded top on a grey post, the slot under the
 * hood, a small plate with the collection times. Big enough to be read as one.
 */
function drawPostbox(ctx: CanvasRenderingContext2D, p: Palette, x: number, base: number): void {
  ctx.lineWidth = OUTLINE
  ctx.strokeStyle = p.hippoDark
  // Post with a foot
  ctx.fillStyle = p.hippoDark
  ctx.fillRect(x - 1.4, base - 12, 2.8, 12.5)
  ctx.beginPath()
  ctx.roundRect(x - 3, base - 1.5, 6, 2, 0.8)
  ctx.fill()
  // Body
  ctx.fillStyle = p.postbox
  ctx.beginPath()
  ctx.roundRect(x - 6.5, base - 24, 13, 12.5, 1.2)
  ctx.fill()
  ctx.stroke()
  // The hood: an arch a little wider than the body, with a lit crown
  ctx.beginPath()
  ctx.moveTo(x - 7.5, base - 24)
  ctx.quadraticCurveTo(x - 7.5, base - 29.5, x, base - 29.5)
  ctx.quadraticCurveTo(x + 7.5, base - 29.5, x + 7.5, base - 24)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.beginPath()
  ctx.moveTo(x - 5.5, base - 24.5)
  ctx.quadraticCurveTo(x - 4, base - 28, x, base - 28.3)
  ctx.quadraticCurveTo(x + 2, base - 28.3, x + 3, base - 27.6)
  ctx.lineTo(x + 2, base - 24.5)
  ctx.closePath()
  ctx.fill()
  // Slot with a lip, and the plate below
  ctx.fillStyle = p.hippoDark
  ctx.beginPath()
  ctx.roundRect(x - 4.5, base - 22.5, 9, 1.8, 0.9)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
  ctx.fillRect(x - 4.5, base - 20.5, 9, 0.8)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.16)'
  ctx.beginPath()
  ctx.roundRect(x - 3.5, base - 18.5, 7, 4.5, 0.8)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.fillRect(x - 2.5, base - 17.3, 5, 0.7)
  ctx.fillRect(x - 2.5, base - 15.8, 3.5, 0.7)
}

/** A litter bin: a dark cylinder with a rim and a slot in the lid. */
function drawBin(ctx: CanvasRenderingContext2D, p: Palette, x: number, base: number): void {
  ctx.lineWidth = OUTLINE
  ctx.strokeStyle = p.hippoDark
  ctx.fillStyle = p.hippoBody
  ctx.beginPath()
  ctx.roundRect(x - 5, base - 13, 10, 13.5, 1.2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = p.hippoDark
  ctx.beginPath()
  ctx.roundRect(x - 6, base - 15, 12, 3, 1)
  ctx.fill()
  ctx.fillStyle = p.hippoLight
  ctx.fillRect(x - 3, base - 14, 6, 1)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.14)'
  ctx.fillRect(x + 1.5, base - 12, 2.5, 12)
  ctx.fillStyle = p.hippoDark
  for (const y of [base - 9, base - 5]) ctx.fillRect(x - 4, y, 8, 0.8)
}

/**
 * A routine that begins half a second to a second after the animal came on screen (`age` in
 * seconds), lasts `share` of `period`, and comes round every `period` after that: 0 outside it,
 * otherwise 0..1 through it. `seed` spreads the start, so two animals never move in step.
 */
function routine(age: number, period: number, share: number, seed: number): number {
  const t = age - 0.5 - seed * 0.5
  if (t < 0) return 0
  const u = (t % period) / period
  return u < share ? u / share : 0
}

/**
 * A black cat sitting up, tail swaying, with white socks and a white bib. Every few seconds it
 * lifts a front paw to its face and licks it, eyes shut, head down to meet the paw. Faces right;
 * the caller may flip it.
 */
function drawCat(ctx: CanvasRenderingContext2D, p: Palette, x: number, base: number, age: number, seed: number): void {
  const coat = mix(p.hippoDark, '#000000', 0.5)
  const line = mix(p.hippoDark, '#000000', 0.78)
  const lick = routine(age, 5, 0.3, seed)
  const licking = lick > 0
  // The tail first, outlined by stroking it twice; its tip sways
  const sway = Math.sin(age * 1.6 + seed * 7) * 1.4
  const tail = new Path2D()
  tail.moveTo(x - 3.5, base - 2.5)
  tail.bezierCurveTo(x - 9, base - 1.5, x - 11.5 + sway, base - 6, x - 8 + sway, base - 10)
  ctx.lineWidth = 2.4 + OUTLINE * 2
  ctx.strokeStyle = line
  ctx.stroke(tail)
  ctx.lineWidth = 2.4
  ctx.strokeStyle = coat
  ctx.stroke(tail)
  ctx.lineWidth = OUTLINE
  ctx.strokeStyle = line
  // Body: a pear, wide at the haunches, the chest out; a white bib on it
  ctx.fillStyle = coat
  ctx.beginPath()
  ctx.moveTo(x - 5.2, base)
  ctx.bezierCurveTo(x - 7, base - 5, x - 5, base - 10.5, x - 0.5, base - 12)
  ctx.bezierCurveTo(x + 2.5, base - 12.5, x + 4, base - 9.5, x + 4.2, base - 6.5)
  ctx.bezierCurveTo(x + 4.6, base - 4, x + 4.8, base - 1.5, x + 4.6, base)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = p.wing
  ctx.beginPath()
  ctx.ellipse(x + 2, base - 5, 1.7, 3, -0.15, 0, Math.PI * 2)
  ctx.fill()
  // Front legs with white socks: the near one lifts to the face while licking
  const leg = (): void => {
    ctx.fillStyle = coat
    ctx.beginPath()
    ctx.roundRect(-1.25, 0, 2.5, 6, 1.1)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = p.wing
    ctx.beginPath()
    ctx.roundRect(-0.95, 4.2, 1.9, 1.5, 0.6)
    ctx.fill()
  }
  ctx.save()
  ctx.translate(x + 1.5, base - 6)
  leg()
  ctx.restore()
  ctx.save()
  if (licking) {
    ctx.translate(x + 4.2, base - 7)
    ctx.rotate(2.63 + Math.sin(lick * Math.PI * 6) * 0.16)
  } else {
    ctx.translate(x + 4.1, base - 6)
  }
  leg()
  ctx.restore()
  // The head, on a neck pivot so it can dip to the paw
  ctx.save()
  ctx.translate(x + 0.5, base - 10)
  if (licking) ctx.rotate(0.28)
  ctx.fillStyle = coat
  ctx.beginPath()
  ctx.moveTo(-4.5, -5)
  ctx.lineTo(-4.1, -9.4)
  ctx.lineTo(-0.9, -6.8)
  ctx.closePath()
  ctx.moveTo(4.5, -5)
  ctx.lineTo(4.3, -9.4)
  ctx.lineTo(1.1, -6.8)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = p.hippoEar
  ctx.beginPath()
  ctx.moveTo(-3.5, -5.8)
  ctx.lineTo(-3.5, -8)
  ctx.lineTo(-1.9, -6.7)
  ctx.closePath()
  ctx.moveTo(3.7, -5.8)
  ctx.lineTo(3.7, -8)
  ctx.lineTo(2.1, -6.7)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = coat
  ctx.beginPath()
  ctx.ellipse(0, -3.6, 4.6, 3.9, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  if (licking) {
    drawShutEye(ctx, p.wing, -1.7, -4, 1.1)
    drawShutEye(ctx, p.wing, 1.7, -4, 1.1)
  } else {
    drawEye(ctx, p.wing, line, -1.7, -4, 1.1)
    drawEye(ctx, p.wing, line, 1.7, -4, 1.1)
  }
  ctx.fillStyle = p.hippoEar
  ctx.beginPath()
  ctx.moveTo(-0.8, -2.4)
  ctx.lineTo(0.8, -2.4)
  ctx.lineTo(0, -1.5)
  ctx.closePath()
  ctx.fill()
  if (licking) {
    // The tongue out to meet the paw
    ctx.beginPath()
    ctx.ellipse(0.7, -1, 0.7, 1, 0.3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.strokeStyle = p.wing
  ctx.globalAlpha = 0.75
  ctx.lineWidth = 0.5
  ctx.beginPath()
  for (const side of [-1, 1]) {
    ctx.moveTo(side * 1.6, -2.2)
    ctx.lineTo(side * 5.8, -2.9)
    ctx.moveTo(side * 1.6, -1.7)
    ctx.lineTo(side * 5.8, -1.3)
  }
  ctx.stroke()
  ctx.restore()
  ctx.lineWidth = OUTLINE
  ctx.strokeStyle = p.hippoDark
}

/**
 * A small yellow dog standing, in the bench's wood: a capsule of a body on four short legs, a
 * round head with a floppy ear, a red collar with a tag, tail up and wagging. Every so often it
 * lifts a hind leg against nothing in particular. Faces right.
 */
function drawDog(ctx: CanvasRenderingContext2D, p: Palette, x: number, base: number, age: number, seed: number): void {
  const coat = p.wood
  const light = mix(p.wood, '#ffffff', 0.45)
  const shade = mix(p.wood, p.hippoDark, 0.16)
  const dark = mix(p.wood, p.hippoDark, 0.32)
  const pee = routine(age, 6, 0.33, seed)
  const peeing = pee > 0
  const wag = Math.sin(age * 6 + seed * 9) * (peeing ? 0.5 : 1.4)
  ctx.lineWidth = OUTLINE
  ctx.strokeStyle = p.hippoDark
  // Tail up, wagging, outlined by stroking it twice
  const tail = new Path2D()
  tail.moveTo(x - 7, base - 10.5)
  tail.quadraticCurveTo(x - 10 + wag, base - 12.5, x - 9.5 + wag, base - 16)
  ctx.lineWidth = 2.2 + OUTLINE * 2
  ctx.stroke(tail)
  ctx.lineWidth = 2.2
  ctx.strokeStyle = coat
  ctx.stroke(tail)
  ctx.lineWidth = OUTLINE
  ctx.strokeStyle = p.hippoDark
  // Legs: the far pair a shade darker, then the body, then the near pair over it
  const leg = (lx: number, color: string): void => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(lx, base - 8, 2.8, 8, [1, 1, 1.4, 1.4])
    ctx.fill()
    ctx.stroke()
  }
  leg(x - 4.2, shade)
  leg(x + 2.4, shade)
  ctx.fillStyle = coat
  ctx.beginPath()
  ctx.roundRect(x - 8.5, base - 14.5, 17, 9, 4.5)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = light
  ctx.beginPath()
  ctx.ellipse(x + 0.5, base - 7.6, 5.5, 1.9, 0, 0, Math.PI * 2)
  ctx.fill()
  leg(x + 4.6, coat)
  ctx.save()
  if (peeing) {
    ctx.translate(x - 5.4, base - 8)
    ctx.rotate(1.45 + Math.sin(pee * Math.PI * 4) * 0.05)
    ctx.translate(-1.4, 0)
    leg(0, coat)
  } else {
    leg(x - 6.8, coat)
  }
  ctx.restore()
  if (peeing) {
    const stream = mix(p.gold, '#ffffff', 0.35)
    ctx.strokeStyle = stream
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.9
    ctx.beginPath()
    ctx.moveTo(x - 3.5, base - 6.5)
    ctx.quadraticCurveTo(x - 8, base - 7, x - 10.5, base - 0.6)
    ctx.stroke()
    ctx.fillStyle = stream
    ctx.globalAlpha = 0.55
    ctx.beginPath()
    ctx.ellipse(x - 11, base - 0.4, 1.5 + pee * 2.5, 0.7, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.lineWidth = OUTLINE
    ctx.strokeStyle = p.hippoDark
  }
  // Collar behind the head, the head, the muzzle with its nose, the eye, the ear over the head
  ctx.fillStyle = p.melonFlesh
  ctx.beginPath()
  ctx.roundRect(x + 5.4, base - 14.2, 2.6, 5, 1)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = p.gold
  ctx.beginPath()
  ctx.arc(x + 6.7, base - 8.8, 1, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = coat
  ctx.beginPath()
  ctx.arc(x + 9.2, base - 15.2, 4.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = light
  ctx.beginPath()
  ctx.ellipse(x + 11.8, base - 13.4, 2.9, 2.2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = p.hippoDark
  ctx.beginPath()
  ctx.ellipse(x + 13.8, base - 14.3, 1.1, 0.85, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.arc(x + 12.2, base - 12.6, 1.2, Math.PI * 0.15, Math.PI * 0.75)
  ctx.stroke()
  ctx.lineWidth = OUTLINE
  drawEye(ctx, p.wing, p.hippoDark, x + 10.2, base - 16.6, 1.05)
  ctx.fillStyle = dark
  ctx.beginPath()
  ctx.moveTo(x + 8, base - 19.2)
  ctx.quadraticCurveTo(x + 4.6, base - 18.4, x + 5, base - 13)
  ctx.quadraticCurveTo(x + 5.3, base - 11, x + 7.2, base - 12)
  ctx.quadraticCurveTo(x + 8.8, base - 14.5, x + 8, base - 19.2)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

/** One of the hippo's eyes, small: white, outlined, a dark pupil a touch off centre. */
function drawEye(ctx: CanvasRenderingContext2D, white: string, dark: string, x: number, y: number, r: number): void {
  ctx.lineWidth = OUTLINE * 0.7
  ctx.strokeStyle = dark
  ctx.fillStyle = white
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = dark
  ctx.beginPath()
  ctx.arc(x + r * 0.2, y + r * 0.15, r * 0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.lineWidth = OUTLINE
}

/** An eye shut in contentment: a small downward arc. */
function drawShutEye(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, r: number): void {
  ctx.strokeStyle = color
  ctx.lineWidth = 0.9
  ctx.beginPath()
  ctx.arc(x, y - r * 0.3, r, Math.PI * 0.15, Math.PI * 0.85)
  ctx.stroke()
  ctx.lineWidth = OUTLINE
}
