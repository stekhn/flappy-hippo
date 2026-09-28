import type { Palette } from '../types.ts'

export function drawEllipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  outline = false,
): void {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  if (outline) ctx.stroke()
}

/** The same ellipse shifted towards the light leaves a shaded crescent at the lower right. */
export function drawShadedEllipse(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  x: number,
  y: number,
  rx: number,
  ry: number,
  dx: number,
  dy: number,
): void {
  ctx.fillStyle = p.hippoBody
  drawEllipse(ctx, x, y, rx, ry)
  ctx.save()
  ctx.clip()
  ctx.fillStyle = p.hippoShade
  ctx.fillRect(x - rx, y - ry, rx * 2, ry * 2)
  ctx.fillStyle = p.hippoBody
  drawEllipse(ctx, x + dx, y + dy, rx, ry)
  ctx.restore()
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.stroke()
}
