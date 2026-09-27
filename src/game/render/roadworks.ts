import { OUTLINE, PIPE_WIDTH } from '../constants.ts'
import { mix } from '../palette.ts'
import type { Palette, Pipe } from '../types.ts'
import type { World } from '../world.ts'

/**
 * A moving pipe is a pipe under repair: a striped barrier with a lamp stands on the street a
 * little before it, and at its foot lies the heap of earth it was dug out of, a shovel stuck in
 * it. Seen well ahead, so a mover is told from a still pipe before it has moved at all.
 */
export function drawRoadworks(ctx: CanvasRenderingContext2D, p: Palette, pipes: Pipe[], world: World): void {
  const ground = world.groundY
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.lineWidth = OUTLINE
  for (const pipe of pipes) {
    if (pipe.swing === 0) continue
    const x = Math.round(pipe.x)
    drawHeap(ctx, p, x, ground)
    drawBarrier(ctx, p, x - 40, ground)
  }
  ctx.restore()
}

/** Earth over the base of the pipe, a few clods on it, the shovel's blade in it and its handle out. */
function drawHeap(ctx: CanvasRenderingContext2D, p: Palette, x: number, ground: number): void {
  const earth = mix(p.wood, '#000000', 0.45)
  const clod = mix(p.wood, '#000000', 0.28)
  const mid = x + PIPE_WIDTH / 2
  ctx.strokeStyle = p.hippoDark
  ctx.fillStyle = earth
  ctx.beginPath()
  ctx.moveTo(x - 18, ground + 1)
  ctx.quadraticCurveTo(x - 6, ground - 11, mid - 6, ground - 12.5)
  ctx.quadraticCurveTo(mid + 14, ground - 14, x + PIPE_WIDTH + 18, ground + 1)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = clod
  for (const [cx, cy, r] of [
    [x - 4, ground - 4, 2.6],
    [mid + 4, ground - 8, 2.2],
    [x + PIPE_WIDTH + 6, ground - 3.5, 2.4],
  ]) {
    ctx.beginPath()
    ctx.ellipse(cx, cy, r, r * 0.75, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  // The shovel: handle stroked twice for an outline, then the blade's top showing above the earth
  const handle = new Path2D()
  handle.moveTo(x + PIPE_WIDTH + 4, ground - 6)
  handle.lineTo(x + PIPE_WIDTH + 13, ground - 27)
  ctx.lineWidth = 2.2 + OUTLINE * 2
  ctx.strokeStyle = p.hippoDark
  ctx.stroke(handle)
  ctx.lineWidth = 2.2
  ctx.strokeStyle = p.wood
  ctx.stroke(handle)
  ctx.lineWidth = OUTLINE
  ctx.strokeStyle = p.hippoDark
  ctx.fillStyle = p.hippoBody
  ctx.beginPath()
  ctx.moveTo(x + PIPE_WIDTH - 1, ground - 7)
  ctx.lineTo(x + PIPE_WIDTH + 8, ground - 9.5)
  ctx.lineTo(x + PIPE_WIDTH + 11, ground - 4)
  ctx.lineTo(x + PIPE_WIDTH + 2, ground - 2)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  // The grip at the top of the handle
  ctx.fillStyle = p.wood
  ctx.beginPath()
  ctx.roundRect(x + PIPE_WIDTH + 9.5, ground - 30, 7, 3, 1.2)
  ctx.fill()
  ctx.stroke()
}

/** A road-works barrier: a board in red and white stripes on two legs, a warning lamp on top. */
function drawBarrier(ctx: CanvasRenderingContext2D, p: Palette, x: number, ground: number): void {
  const red = mix(p.melonFlesh, p.gold, 0.25)
  ctx.strokeStyle = p.hippoDark
  ctx.fillStyle = p.hippoDark
  for (const lx of [x - 9, x + 9]) ctx.fillRect(lx - 1, ground - 13, 2, 13)
  ctx.fillStyle = p.wing
  ctx.beginPath()
  ctx.roundRect(x - 14, ground - 17, 28, 7, 1)
  ctx.fill()
  ctx.save()
  ctx.clip()
  ctx.fillStyle = red
  for (let sx = x - 16; sx < x + 16; sx += 8) {
    ctx.beginPath()
    ctx.moveTo(sx, ground - 10)
    ctx.lineTo(sx + 4, ground - 10)
    ctx.lineTo(sx + 9, ground - 17)
    ctx.lineTo(sx + 5, ground - 17)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  ctx.beginPath()
  ctx.roundRect(x - 14, ground - 17, 28, 7, 1)
  ctx.stroke()
  ctx.fillStyle = p.gold
  ctx.beginPath()
  ctx.arc(x, ground - 19.5, 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}
