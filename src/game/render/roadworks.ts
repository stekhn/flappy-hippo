import { OUTLINE, PIPE_WIDTH } from '../constants.ts'
import { mix } from '../palette.ts'
import type { Palette, Pipe } from '../types.ts'
import type { World } from '../world.ts'
import type { LayerCache } from './layers.ts'

/** How far before the pipe the barrier stands. */
const BARRIER_LEAD = 40

/**
 * A moving pipe is a pipe under repair: a striped barrier with a lamp stands on the street a
 * little before it, and at its foot lies the heap of earth it was dug out of, a shovel stuck in
 * it. Seen well ahead, so a mover is told from a still pipe before it has moved at all. Both are
 * sprites, stamped at the pipe's foot.
 */
export function drawRoadworks(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  pipes: Pipe[],
  world: World,
  cache: LayerCache,
): void {
  const heap = cache.sprite('heap', -20, -32, PIPE_WIDTH + 40, 34, (c) => paintHeap(c, p))
  const barrier = cache.sprite('barrier', -16, -23, 32, 24.5, (c) => paintBarrier(c, p))
  for (const pipe of pipes) {
    if (pipe.swing === 0) continue
    const x = Math.round(pipe.x)
    cache.stamp(ctx, heap, x, world.groundY)
    cache.stamp(ctx, barrier, x - BARRIER_LEAD, world.groundY)
  }
}

/** Earth over the base of the pipe, a few clods on it, the shovel's blade in it and its handle out. */
function paintHeap(ctx: CanvasRenderingContext2D, p: Palette): void {
  const earth = mix(p.wood, '#000000', 0.45)
  const clod = mix(p.wood, '#000000', 0.28)
  const mid = PIPE_WIDTH / 2
  ctx.lineWidth = OUTLINE
  ctx.strokeStyle = p.hippoDark
  ctx.fillStyle = earth
  ctx.beginPath()
  ctx.moveTo(-18, 1)
  ctx.quadraticCurveTo(-6, -11, mid - 6, -12.5)
  ctx.quadraticCurveTo(mid + 14, -14, PIPE_WIDTH + 18, 1)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = clod
  for (const [cx, cy, r] of [
    [-4, -4, 2.6],
    [mid + 4, -8, 2.2],
    [PIPE_WIDTH + 6, -3.5, 2.4],
  ]) {
    ctx.beginPath()
    ctx.ellipse(cx, cy, r, r * 0.75, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  // The shovel: handle stroked twice for an outline, then the blade's top showing above the earth
  const handle = new Path2D()
  handle.moveTo(PIPE_WIDTH + 4, -6)
  handle.lineTo(PIPE_WIDTH + 13, -27)
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
  ctx.moveTo(PIPE_WIDTH - 1, -7)
  ctx.lineTo(PIPE_WIDTH + 8, -9.5)
  ctx.lineTo(PIPE_WIDTH + 11, -4)
  ctx.lineTo(PIPE_WIDTH + 2, -2)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = p.wood
  ctx.beginPath()
  ctx.roundRect(PIPE_WIDTH + 9.5, -30, 7, 3, 1.2)
  ctx.fill()
  ctx.stroke()
}

/** A road-works barrier: a board in red and white stripes on two legs, a warning lamp on top. */
function paintBarrier(ctx: CanvasRenderingContext2D, p: Palette): void {
  const red = mix(p.melonFlesh, p.gold, 0.25)
  ctx.lineWidth = OUTLINE
  ctx.strokeStyle = p.hippoDark
  ctx.fillStyle = p.hippoDark
  for (const lx of [-9, 9]) ctx.fillRect(lx - 1, -13, 2, 13)
  ctx.fillStyle = p.wing
  ctx.beginPath()
  ctx.roundRect(-14, -17, 28, 7, 1)
  ctx.fill()
  ctx.save()
  ctx.clip()
  ctx.fillStyle = red
  for (let sx = -16; sx < 16; sx += 8) {
    ctx.beginPath()
    ctx.moveTo(sx, -10)
    ctx.lineTo(sx + 4, -10)
    ctx.lineTo(sx + 9, -17)
    ctx.lineTo(sx + 5, -17)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  ctx.beginPath()
  ctx.roundRect(-14, -17, 28, 7, 1)
  ctx.stroke()
  ctx.fillStyle = p.gold
  ctx.beginPath()
  ctx.arc(0, -19.5, 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}
