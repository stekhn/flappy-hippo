import {
  CAP_SHADOW,
  CAP_SHADOW_HEIGHT,
  PIPE_CAP_HEIGHT,
  PIPE_CAP_OVERHANG,
  PIPE_HIGHLIGHT,
  PIPE_OUTLINE,
  PIPE_OVERRUN,
  PIPE_SHADE,
  PIPE_WIDTH,
} from '../constants.ts'
import type { Palette, Pipe } from '../types.ts'
import type { World } from '../world.ts'

/**
 * Pipes in the same soft hand as the hippo: a round shading across the body instead of hard
 * bands, a thin edge, rounded caps. They must be read at a glance, not shout.
 */
export function drawPipes(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  pipes: Pipe[],
  world: World,
): void {
  for (const pipe of pipes) {
    // Whole pixels keep the outline crisp while the pipe scrolls
    const x = Math.round(pipe.x)
    if (pipe.swing > 0) drawRail(ctx, p, x, world)
    drawPipeSegment(ctx, p, x, 0, pipe.gapY - pipe.half, true)
    drawPipeSegment(ctx, p, x, pipe.gapY + pipe.half, world.groundY, false)
  }
}

/**
 * A moving pipe runs on a rail: a faint line down its middle, seen in the gap, so the motion
 * reads as a mechanism and a mover is told from a still pipe at a glance.
 */
function drawRail(ctx: CanvasRenderingContext2D, p: Palette, x: number, world: World): void {
  ctx.save()
  ctx.globalAlpha = 0.3
  ctx.fillStyle = p.pipeEdge
  ctx.fillRect(x + PIPE_WIDTH / 2 - 1.5, 0, 3, world.groundY)
  ctx.restore()
}

function drawPipeSegment(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  x: number,
  top: number,
  bottom: number,
  capAtBottom: boolean,
): void {
  if (bottom <= top) return
  const bodyTop = capAtBottom ? top - PIPE_OVERRUN : top
  const bodyBottom = capAtBottom ? bottom : bottom + PIPE_OVERRUN
  drawPipeBlock(ctx, p, x, bodyTop, PIPE_WIDTH, bodyBottom - bodyTop, 0)

  const capY = capAtBottom ? bottom - PIPE_CAP_HEIGHT : top
  ctx.fillStyle = CAP_SHADOW
  ctx.fillRect(
    x,
    capAtBottom ? capY - CAP_SHADOW_HEIGHT : capY + PIPE_CAP_HEIGHT,
    PIPE_WIDTH,
    CAP_SHADOW_HEIGHT,
  )
  drawPipeBlock(
    ctx,
    p,
    x - PIPE_CAP_OVERHANG,
    capY,
    PIPE_WIDTH + PIPE_CAP_OVERHANG * 2,
    PIPE_CAP_HEIGHT,
    2,
  )
}

function drawPipeBlock(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  // A cylinder's light: bright a third of the way in from the left, darkening toward the right.
  const shading = ctx.createLinearGradient(x, 0, x + w, 0)
  shading.addColorStop(0, p.pipe)
  shading.addColorStop(0.28, p.pipeLight)
  shading.addColorStop(0.62, p.pipe)
  shading.addColorStop(1, p.pipe)
  ctx.fillStyle = shading
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, radius)
  ctx.fill()
  ctx.fillStyle = PIPE_HIGHLIGHT
  ctx.beginPath()
  ctx.roundRect(x + w * 0.2, y, w * 0.12, h, 1)
  ctx.fill()
  ctx.fillStyle = PIPE_SHADE
  ctx.beginPath()
  ctx.roundRect(x + w * 0.74, y, w * 0.26, h, radius)
  ctx.fill()
  ctx.strokeStyle = p.pipeEdge
  ctx.lineWidth = PIPE_OUTLINE
  ctx.beginPath()
  ctx.roundRect(x + PIPE_OUTLINE / 2, y + PIPE_OUTLINE / 2, w - PIPE_OUTLINE, h - PIPE_OUTLINE, radius)
  ctx.stroke()
}
