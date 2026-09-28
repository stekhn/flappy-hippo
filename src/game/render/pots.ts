import { BRICK_HEIGHT, BRICK_WIDTH, OUTLINE } from '../constants.ts'
import { mix } from '../palette.ts'
import type { Palette, Pot } from '../types.ts'
import type { LayerCache } from './layers.ts'

/** The balcony a pot stands on: a brick parapet hanging from the top edge, a stone cap, a slab. */
const BALCONY_WIDTH = 46
const PARAPET_HEIGHT = 20
const CAP_HEIGHT = 3
const SLAB_HEIGHT = 3.5

/**
 * Flower pots and the balconies they come off. A balcony is a bit of the same brickwork as the
 * street wall, hanging from the top edge; the pot stands on its cap, wobbles, then tips off and
 * tumbles. The balcony stays and scrolls by, pot or no pot. Terracotta is the bench's wood and
 * the plant the street's greens, so they belong to the world they fall into. Both are sprites:
 * painted once, stamped every frame, the pot turned as it tumbles.
 */
export function drawPots(ctx: CanvasRenderingContext2D, p: Palette, pots: Pot[], cache: LayerCache): void {
  const balcony = cache.sprite(
    'balcony',
    -BALCONY_WIDTH / 2 - 3,
    0,
    BALCONY_WIDTH + 6,
    PARAPET_HEIGHT + CAP_HEIGHT + SLAB_HEIGHT + 1.5,
    (c) => paintBalcony(c, p),
  )
  const pot = cache.sprite('pot', -10, -20.5, 20, 31.5, (c) => paintPot(c, p))
  for (const each of pots) cache.stamp(ctx, balcony, Math.round(each.x), 0)
  for (const each of pots) {
    if (each.smashed) continue
    cache.stamp(ctx, pot, Math.round(each.x), each.y, each.spin)
  }
}

function paintBalcony(ctx: CanvasRenderingContext2D, p: Palette): void {
  const left = -BALCONY_WIDTH / 2
  // The parapet: the wall's bricks, bevelled the same way.
  ctx.fillStyle = p.ground
  ctx.fillRect(left, 0, BALCONY_WIDTH, PARAPET_HEIGHT)
  const joints = new Path2D()
  const edges = new Path2D()
  for (let row = 0; row * BRICK_HEIGHT < PARAPET_HEIGHT; row++) {
    const y = row * BRICK_HEIGHT + 0.5
    if (row > 0) {
      joints.moveTo(left, y)
      joints.lineTo(left + BALCONY_WIDTH, y)
      edges.moveTo(left, y + 1)
      edges.lineTo(left + BALCONY_WIDTH, y + 1)
    }
    const shift = (row % 2) * (BRICK_WIDTH / 2)
    for (let bx = left + shift - BRICK_WIDTH + 3; bx < left + BALCONY_WIDTH; bx += BRICK_WIDTH) {
      if (bx <= left) continue
      joints.moveTo(bx + 0.5, y)
      joints.lineTo(bx + 0.5, Math.min(y + BRICK_HEIGHT, PARAPET_HEIGHT))
      edges.moveTo(bx + 1.5, y + 1)
      edges.lineTo(bx + 1.5, Math.min(y + BRICK_HEIGHT, PARAPET_HEIGHT))
    }
  }
  ctx.lineWidth = 1
  ctx.strokeStyle = p.groundLine
  ctx.stroke(joints)
  ctx.strokeStyle = p.groundHighlight
  ctx.stroke(edges)
  // The cap the pot stands on, a touch wider and lighter, and the slab under everything.
  ctx.lineWidth = OUTLINE
  ctx.strokeStyle = p.groundLine
  ctx.fillStyle = mix(p.ground, '#ffffff', 0.28)
  ctx.beginPath()
  ctx.roundRect(left - 2, PARAPET_HEIGHT, BALCONY_WIDTH + 4, CAP_HEIGHT, 0.8)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = p.ground
  ctx.beginPath()
  ctx.roundRect(left + 3, PARAPET_HEIGHT + CAP_HEIGHT, BALCONY_WIDTH - 6, SLAB_HEIGHT, [0, 0, 1.5, 1.5])
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(left, 0)
  ctx.lineTo(left, PARAPET_HEIGHT)
  ctx.moveTo(left + BALCONY_WIDTH, 0)
  ctx.lineTo(left + BALCONY_WIDTH, PARAPET_HEIGHT)
  ctx.stroke()
}

function paintPot(ctx: CanvasRenderingContext2D, p: Palette): void {
  // Soil above the rim, then the plant out of it: three leaves and one small flower.
  ctx.fillStyle = mix(p.wood, '#000000', 0.55)
  ctx.beginPath()
  ctx.ellipse(0, -8.3, 6.4, 1.6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.lineWidth = 2
  for (const [color, leaves] of [
    [
      p.grassShade,
      [
        [-2, -8, -7.5, -14],
        [3, -8, 7, -13.5],
      ],
    ],
    [p.grassLit, [[0, -8, -1, -16.5]]],
  ] as const) {
    ctx.strokeStyle = color
    ctx.beginPath()
    for (const [x0, y0, x1, y1] of leaves) {
      ctx.moveTo(x0, y0)
      ctx.quadraticCurveTo((x0 + x1) / 2 - 2, (y0 + y1) / 2, x1, y1)
    }
    ctx.stroke()
  }
  ctx.fillStyle = p.flower
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(-1 + Math.cos(a) * 1.7, -16.5 + Math.sin(a) * 1.7, 1, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = p.flowerCenter
  ctx.beginPath()
  ctx.arc(-1, -16.5, 0.9, 0, Math.PI * 2)
  ctx.fill()
  // The pot: a tapered body under a wider rim, lit from the left like everything else.
  ctx.lineWidth = OUTLINE
  ctx.strokeStyle = p.hippoDark
  ctx.fillStyle = p.wood
  ctx.beginPath()
  ctx.moveTo(-6.5, -4)
  ctx.lineTo(6.5, -4)
  ctx.lineTo(5, 8)
  ctx.quadraticCurveTo(0, 9.6, -5, 8)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)'
  ctx.beginPath()
  ctx.moveTo(2.5, -4)
  ctx.lineTo(6.5, -4)
  ctx.lineTo(5, 8)
  ctx.quadraticCurveTo(3.5, 9.2, 2, 9.2)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)'
  ctx.beginPath()
  ctx.moveTo(-5, -3)
  ctx.lineTo(-3, -3)
  ctx.lineTo(-2.2, 7)
  ctx.lineTo(-4, 6.5)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = p.wood
  ctx.beginPath()
  ctx.roundRect(-8, -8.5, 16, 5, 1.4)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'
  ctx.fillRect(-6, -7.3, 6, 1.2)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)'
  ctx.fillRect(2, -7.3, 5, 3)
}
