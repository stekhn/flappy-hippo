import { OUTLINE } from '../constants.ts'
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

export function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
): void {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45
    const angle = -Math.PI / 2 + (i * Math.PI) / 5
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius)
  }
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

export function easeOut(t: number): number {
  return 1 - (1 - t) ** 3
}

/** Resets the stroke weight the hippo and the pipes both rely on. */
export function resetOutline(ctx: CanvasRenderingContext2D): void {
  ctx.lineWidth = OUTLINE
}
