import {
  CAP_SHADOW,
  CAP_SHADOW_HEIGHT,
  OUTLINE,
  PIPE_BAND_INSET,
  PIPE_BAND_WIDTH,
  PIPE_CAP_HEIGHT,
  PIPE_CAP_OVERHANG,
  PIPE_HIGHLIGHT,
  PIPE_OVERRUN,
  PIPE_SHADE,
  PIPE_WIDTH,
} from '../constants.ts'
import type { Palette, Pipe } from '../types.ts'
import type { World } from '../world.ts'

export function drawPipes(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  pipes: Pipe[],
  world: World,
): void {
  for (const pipe of pipes) {
    // Whole pixels keep the outline crisp while the pipe scrolls
    const x = Math.round(pipe.x)
    drawPipeSegment(ctx, p, x, 0, pipe.gapY - pipe.half, true)
    drawPipeSegment(ctx, p, x, pipe.gapY + pipe.half, world.groundY, false)
  }
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
  drawPipeBlock(ctx, p, x, bodyTop, PIPE_WIDTH, bodyBottom - bodyTop)

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
  )
}

function drawPipeBlock(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.fillStyle = p.pipe
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = PIPE_HIGHLIGHT
  ctx.fillRect(x + PIPE_BAND_INSET, y, PIPE_BAND_WIDTH, h)
  ctx.fillStyle = PIPE_SHADE
  ctx.fillRect(x + w - PIPE_BAND_INSET - PIPE_BAND_WIDTH, y, PIPE_BAND_WIDTH, h)
  ctx.strokeStyle = p.pipeEdge
  ctx.lineWidth = OUTLINE
  ctx.strokeRect(x + OUTLINE / 2, y + OUTLINE / 2, w - OUTLINE, h - OUTLINE)
}
