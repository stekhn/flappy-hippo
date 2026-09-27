import { BRICK_WIDTH, OUTLINE, SCENE_PERIOD } from '../constants.ts'
import type { Palette } from '../types.ts'
import type { World } from '../world.ts'
import { seeded } from './scenery.ts'

// The foreground: what stands on the wall and scrolls with it. A small vocabulary of plants and
// street furniture, all rooted in the joints between the top row's bricks (the scene repeats on
// a multiple of the brick width, so they stay in the cracks however far the wall has scrolled),
// drawn in the same outlined style as the hippo and the pipes and in their colours. Sparse: the
// hippo and the pipes are the show, this is the set dressing.

type Kind =
  | 'tuft'
  | 'tall'
  | 'clover'
  | 'dandelion'
  | 'buttercups'
  | 'can'
  | 'paper'
  | 'bench'
  | 'postbox'
  | 'bike'

interface Blade {
  dx: number
  h: number
  lean: number
  w: number
  lit: boolean
}

interface Prop {
  kind: Kind
  x: number
  blades: Blade[]
  /** Per-prop variation: a tilt, a flip, a stalk height. */
  seed: number
}

/** How often each thing turns up. Plants carry the rhythm; furniture is the exception. */
const WEIGHTS: [Kind, number][] = [
  ['tuft', 30],
  ['tall', 12],
  ['clover', 12],
  ['dandelion', 10],
  ['buttercups', 8],
  ['can', 5],
  ['paper', 5],
  ['bench', 6],
  ['postbox', 6],
  ['bike', 6],
]
const FURNITURE = new Set<Kind>(['bench', 'postbox', 'bike'])
/** Two pieces of furniture never share a screen. */
const FURNITURE_GAP = 360

function pick(rnd: () => number): Kind {
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

export function makeStreet(seed: number): Prop[] {
  const rnd = seeded(seed)
  const out: Prop[] = []
  const joints = SCENE_PERIOD / BRICK_WIDTH
  let joint = 1
  let lastFurniture = -FURNITURE_GAP
  while (joint < joints) {
    let kind = pick(rnd)
    const x = joint * BRICK_WIDTH
    if (FURNITURE.has(kind) && x - lastFurniture < FURNITURE_GAP) kind = 'tuft'
    if (FURNITURE.has(kind)) lastFurniture = x
    out.push({
      kind,
      x,
      blades: kind === 'tuft' || kind === 'tall' ? makeBlades(rnd, kind === 'tall' ? 3 + Math.floor(rnd() * 2) : 4 + Math.floor(rnd() * 4), kind === 'tall') : [],
      seed: rnd(),
    })
    joint += 1 + Math.floor(rnd() * 3)
  }
  return out
}

const STREET = makeStreet(59)

export function drawStreet(ctx: CanvasRenderingContext2D, p: Palette, world: World, scrolled: number): void {
  const base = world.groundY
  const shift = scrolled % SCENE_PERIOD
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const prop of STREET) {
    for (const offset of [0, SCENE_PERIOD]) {
      const x = prop.x - shift + offset
      if (x < -30 || x > world.width + 30) continue
      // Plants root in an opened joint; furniture simply stands on the wall.
      if (!FURNITURE.has(prop.kind)) {
        ctx.fillStyle = p.groundLine
        ctx.fillRect(x - 1.5, base, 3, 6)
      }
      switch (prop.kind) {
        case 'tuft':
        case 'tall':
          drawBlades(ctx, p, x, base, prop.blades)
          break
        case 'clover':
          drawClover(ctx, p, x, base)
          break
        case 'dandelion':
          drawDandelion(ctx, p, x, base, prop.seed)
          break
        case 'buttercups':
          drawButtercups(ctx, p, x, base, prop.seed)
          break
        case 'can':
          drawCan(ctx, p, x, base, prop.seed)
          break
        case 'paper':
          drawPaper(ctx, p, x, base, prop.seed)
          break
        case 'bench':
          drawBench(ctx, p, x, base)
          break
        case 'postbox':
          drawPostbox(ctx, p, x, base)
          break
        case 'bike':
          drawBike(ctx, p, x, base, prop.seed)
          break
      }
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

/** A postbox on a post. Yellow, as they are here, in the palette's gold. */
function drawPostbox(ctx: CanvasRenderingContext2D, p: Palette, x: number, base: number): void {
  ctx.lineWidth = OUTLINE
  ctx.strokeStyle = p.hippoDark
  ctx.fillStyle = p.hippoDark
  ctx.fillRect(x - 1.2, base - 10, 2.4, 10.5)
  ctx.fillStyle = p.postbox
  ctx.beginPath()
  ctx.roundRect(x - 5, base - 21, 10, 12, 1.8)
  ctx.fill()
  ctx.stroke()
  // Lid ridge and slot
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)'
  ctx.fillRect(x - 5, base - 21, 10, 2.4)
  ctx.fillStyle = p.hippoDark
  ctx.fillRect(x - 3, base - 16.5, 6, 1.4)
}

/** A bicycle on its stand, seen from the side. */
function drawBike(ctx: CanvasRenderingContext2D, p: Palette, x: number, base: number, seed: number): void {
  ctx.save()
  if (seed > 0.5) {
    ctx.translate(x, 0)
    ctx.scale(-1, 1)
    ctx.translate(-x, 0)
  }
  const y = base - 5
  ctx.lineWidth = 1.4
  ctx.strokeStyle = p.hippoDark
  // Wheels with a hint of spokes
  for (const wx of [x - 8, x + 8]) {
    ctx.beginPath()
    ctx.arc(wx, y, 5, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = p.hippoBody
    ctx.lineWidth = 0.8
    ctx.beginPath()
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI
      ctx.moveTo(wx - Math.cos(a) * 4.2, y - Math.sin(a) * 4.2)
      ctx.lineTo(wx + Math.cos(a) * 4.2, y + Math.sin(a) * 4.2)
    }
    ctx.stroke()
    ctx.strokeStyle = p.hippoDark
    ctx.lineWidth = 1.4
  }
  // Frame: rear hub → crank → seat, seat → head tube → front hub, top tube
  ctx.beginPath()
  ctx.moveTo(x - 8, y)
  ctx.lineTo(x - 1, y + 1)
  ctx.lineTo(x - 3, y - 8)
  ctx.lineTo(x - 8, y)
  ctx.moveTo(x - 3, y - 8)
  ctx.lineTo(x + 5, y - 8)
  ctx.lineTo(x + 8, y)
  ctx.moveTo(x - 1, y + 1)
  ctx.lineTo(x + 5, y - 8)
  ctx.moveTo(x - 3, y - 8)
  ctx.lineTo(x - 4, y - 10.5)
  ctx.moveTo(x + 5, y - 8)
  ctx.lineTo(x + 6.5, y - 11)
  ctx.stroke()
  // Saddle, handlebar, crank
  ctx.fillStyle = p.hippoDark
  ctx.beginPath()
  ctx.roundRect(x - 6.5, y - 12, 5, 1.8, 0.9)
  ctx.fill()
  ctx.beginPath()
  ctx.roundRect(x + 5, y - 12, 4, 1.4, 0.7)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x - 1, y + 1, 1.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
