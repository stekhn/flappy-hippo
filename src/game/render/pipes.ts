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
import type { LayerCache, Sprite } from './layers.ts'

/**
 * Pipes in the same soft hand as the hippo: a round shading across the body instead of hard
 * bands, a thin edge, rounded caps. They must be read at a glance, not shout. Two sprites do
 * every pipe: a body as tall as the field, cropped to the segment pixel for pixel (a short strip
 * stretched instead would blur into transparency at its ends), and the cap.
 */
export function drawPipes(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  pipes: Pipe[],
  world: World,
  cache: LayerCache,
): void {
  const tall = world.height + PIPE_OVERRUN * 2
  const body = cache.sprite(`pipe-body-${tall}`, 0, 0, PIPE_WIDTH, tall, (c) => paintBody(c, p, tall))
  const cap = cache.sprite('pipe-cap', 0, 0, PIPE_WIDTH + PIPE_CAP_OVERHANG * 2, PIPE_CAP_HEIGHT, (c) =>
    paintBlock(c, p, 0, 0, PIPE_WIDTH + PIPE_CAP_OVERHANG * 2, PIPE_CAP_HEIGHT, 2),
  )
  for (const pipe of pipes) {
    // Whole pixels keep the outline crisp while the pipe scrolls.
    const x = Math.round(pipe.x)
    drawSegment(ctx, body, cap, x, 0, pipe.gapY - pipe.half, true)
    drawSegment(ctx, body, cap, x, pipe.gapY + pipe.half, world.groundY, false)
  }
}

function drawSegment(
  ctx: CanvasRenderingContext2D,
  body: Sprite,
  cap: Sprite,
  x: number,
  top: number,
  bottom: number,
  capAtBottom: boolean,
): void {
  if (bottom <= top) return
  const bodyTop = capAtBottom ? top - PIPE_OVERRUN : top
  const bodyBottom = capAtBottom ? bottom : bottom + PIPE_OVERRUN
  // Cropped from the tall body at its own resolution, so nothing is resampled.
  const rows = Math.min(body.canvas.height, Math.max(1, Math.round((bodyBottom - bodyTop) * body.scale)))
  ctx.drawImage(body.canvas, 0, 0, body.canvas.width, rows, x, bodyTop, PIPE_WIDTH, rows / body.scale)

  const capY = capAtBottom ? bottom - PIPE_CAP_HEIGHT : top
  ctx.fillStyle = CAP_SHADOW
  ctx.fillRect(
    x,
    capAtBottom ? capY - CAP_SHADOW_HEIGHT : capY + PIPE_CAP_HEIGHT,
    PIPE_WIDTH,
    CAP_SHADOW_HEIGHT,
  )
  ctx.drawImage(cap.canvas, x - PIPE_CAP_OVERHANG, capY, cap.width, cap.height)
}

/** A cylinder's light: bright a third of the way in from the left, darkening toward the right. */
function shading(ctx: CanvasRenderingContext2D, p: Palette, x: number, w: number): CanvasGradient {
  const gradient = ctx.createLinearGradient(x, 0, x + w, 0)
  gradient.addColorStop(0, p.pipe)
  gradient.addColorStop(0.28, p.pipeLight)
  gradient.addColorStop(0.62, p.pipe)
  gradient.addColorStop(1, p.pipe)
  return gradient
}

/** The body: shading, highlight and shade, and the two long edges; the caps cover its ends. */
function paintBody(ctx: CanvasRenderingContext2D, p: Palette, height: number): void {
  const w = PIPE_WIDTH
  ctx.fillStyle = shading(ctx, p, 0, w)
  ctx.fillRect(0, 0, w, height)
  ctx.fillStyle = PIPE_HIGHLIGHT
  ctx.fillRect(w * 0.2, 0, w * 0.12, height)
  ctx.fillStyle = PIPE_SHADE
  ctx.fillRect(w * 0.74, 0, w * 0.26, height)
  ctx.strokeStyle = p.pipeEdge
  ctx.lineWidth = PIPE_OUTLINE
  ctx.lineCap = 'butt'
  ctx.beginPath()
  ctx.moveTo(PIPE_OUTLINE / 2, 0)
  ctx.lineTo(PIPE_OUTLINE / 2, height)
  ctx.moveTo(w - PIPE_OUTLINE / 2, 0)
  ctx.lineTo(w - PIPE_OUTLINE / 2, height)
  ctx.stroke()
}

function paintBlock(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  ctx.fillStyle = shading(ctx, p, x, w)
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
