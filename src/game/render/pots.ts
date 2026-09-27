import { OUTLINE } from '../constants.ts'
import type { Palette, Pot } from '../types.ts'

/**
 * Flower pots: they rest on the top edge, wobbling, then drop and tumble. Terracotta is the
 * bench's wood and the plant the street's greens, so they belong to the world they fall into.
 */
export function drawPots(ctx: CanvasRenderingContext2D, p: Palette, pots: Pot[]): void {
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  for (const pot of pots) {
    ctx.save()
    ctx.translate(Math.round(pot.x), pot.y)
    ctx.rotate(pot.spin)
    drawPot(ctx, p)
    ctx.restore()
  }
  ctx.restore()
}

function drawPot(ctx: CanvasRenderingContext2D, p: Palette): void {
  // The plant: three leaves up out of the soil, the shaded ones first
  ctx.lineWidth = 2
  for (const [color, leaves] of [
    [
      p.grassShade,
      [
        [-2, -8, -7, -14],
        [3, -8, 7, -13],
      ],
    ],
    [p.grassLit, [[0, -8, -1, -16]]],
  ] as const) {
    ctx.strokeStyle = color
    ctx.beginPath()
    for (const [x0, y0, x1, y1] of leaves) {
      ctx.moveTo(x0, y0)
      ctx.quadraticCurveTo((x0 + x1) / 2 - 2, (y0 + y1) / 2, x1, y1)
    }
    ctx.stroke()
  }
  // The pot: a tapered body under a wider rim, lit from the left like everything else
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
  ctx.fillStyle = p.wood
  ctx.beginPath()
  ctx.roundRect(-8, -8.5, 16, 5, 1.4)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'
  ctx.fillRect(-6, -7.3, 6, 1.2)
}
