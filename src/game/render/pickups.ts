import { OUTLINE, PICKUP_RADIUS } from '../constants.ts'
import { alpha } from '../palette.ts'
import { drawBubbleSkin } from './bubble.ts'
import type { Palette, Pickup } from '../types.ts'

export function drawPickups(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  pickups: Pickup[],
  now: number,
): void {
  for (const pickup of pickups) {
    if (pickup.taken) continue
    const bob = Math.sin(now / 420 + pickup.seed) * 3
    ctx.save()
    ctx.translate(pickup.x, pickup.y + bob)
    if (pickup.kind === 'melon') {
      const pulse = 1 + Math.sin(now / 240 + pickup.seed) * 0.06
      ctx.scale(pulse, pulse)
      drawMelon(ctx, p, Math.sin(now / 700 + pickup.seed) * 0.25)
    }
    else drawShieldOrb(ctx, p, now, pickup.seed)
    ctx.restore()
  }
}

/**
 * A melon wedge: green rind, pink flesh, three pips. Rocking gently on its flat side, in a
 * soft glow of the melon green, as the shield orb has its violet.
 */
function drawMelon(ctx: CanvasRenderingContext2D, p: Palette, tilt: number): void {
  const r = PICKUP_RADIUS
  const glow = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 1.8)
  glow.addColorStop(0, alpha(p.melon, 0.3))
  glow.addColorStop(1, alpha(p.melon, 0))
  ctx.fillStyle = glow
  ctx.fillRect(-r * 1.8, -r * 1.8, r * 3.6, r * 3.6)
  ctx.rotate(tilt)
  ctx.lineWidth = OUTLINE + 0.3
  ctx.strokeStyle = 'rgba(24, 58, 36, 0.7)'

  ctx.fillStyle = p.melonRind
  ctx.beginPath()
  ctx.arc(0, r * 0.45, r, Math.PI, Math.PI * 2)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = p.melonFlesh
  ctx.beginPath()
  ctx.arc(0, r * 0.45, r - 2.4, Math.PI, Math.PI * 2)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = p.melonSeed
  for (const [sx, sy] of [
    [-3.4, -1.6],
    [3.4, -1.6],
    [0, -4.2],
  ]) {
    ctx.beginPath()
    ctx.ellipse(sx, sy + r * 0.45, 0.9, 1.4, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** The shield pickup: the very bubble the hippo will wear, a small shield emblem afloat inside. */
function drawShieldOrb(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  now: number,
  seed: number,
): void {
  const pulse = 1 + Math.sin(now / 260 + seed) * 0.07
  const r = PICKUP_RADIUS * 1.25 * pulse
  drawBubbleSkin(ctx, p, r, now / 900 + seed)
  // The emblem: outlined like everything else, its fill light enough to keep the bubble clear
  const e = r * 0.82
  ctx.lineJoin = 'round'
  ctx.strokeStyle = p.bubbleEdge
  ctx.lineWidth = 1.4
  ctx.fillStyle = alpha(p.bubbleEdge, 0.3)
  ctx.beginPath()
  ctx.moveTo(0, -e * 0.55)
  ctx.lineTo(e * 0.45, -e * 0.3)
  ctx.lineTo(e * 0.45, e * 0.15)
  ctx.quadraticCurveTo(e * 0.45, e * 0.6, 0, e * 0.62)
  ctx.quadraticCurveTo(-e * 0.45, e * 0.6, -e * 0.45, e * 0.15)
  ctx.lineTo(-e * 0.45, -e * 0.3)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}
