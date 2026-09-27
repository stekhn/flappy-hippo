import { OUTLINE, PICKUP_RADIUS } from '../constants.ts'
import { alpha } from '../palette.ts'
import type { Palette, Pickup } from '../types.ts'
import { drawBubbleSkin } from './bubble.ts'
import type { LayerCache } from './layers.ts'

/** How far the melon's glow reaches, and so how big its sprite is. */
const MELON_SPAN = PICKUP_RADIUS * 1.8 + 1
/** The shield emblem is baked at the orb's resting size and scaled with its pulse. */
const EMBLEM = PICKUP_RADIUS * 1.25 * 0.82

export function drawPickups(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  pickups: Pickup[],
  now: number,
  cache: LayerCache,
): void {
  const melon = cache.sprite('melon', -MELON_SPAN, -MELON_SPAN, MELON_SPAN * 2, MELON_SPAN * 2, (c) => paintMelon(c, p))
  const emblem = cache.sprite('shield-emblem', -8, -9, 16, 18, (c) => paintEmblem(c, p))
  for (const pickup of pickups) {
    if (pickup.taken) continue
    const bob = Math.sin(now / 420 + pickup.seed) * 3
    ctx.save()
    ctx.translate(pickup.x, pickup.y + bob)
    if (pickup.kind === 'melon') {
      const pulse = 1 + Math.sin(now / 240 + pickup.seed) * 0.06
      ctx.scale(pulse, pulse)
      cache.stamp(ctx, melon, 0, 0, Math.sin(now / 700 + pickup.seed) * 0.25)
    } else {
      // The very bubble the hippo will wear, a small shield emblem afloat inside
      const pulse = 1 + Math.sin(now / 260 + pickup.seed) * 0.07
      drawBubbleSkin(ctx, p, PICKUP_RADIUS * 1.25 * pulse, now / 900 + pickup.seed, cache)
      ctx.scale(pulse, pulse)
      cache.stamp(ctx, emblem, 0, 0)
    }
    ctx.restore()
  }
}

/**
 * A melon wedge: green rind, pink flesh, three pips, in a soft glow of the melon green, as the
 * shield orb has its violet. Painted once about the origin; it rocks and pulses as a whole.
 */
function paintMelon(ctx: CanvasRenderingContext2D, p: Palette): void {
  const r = PICKUP_RADIUS
  const glow = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 1.8)
  glow.addColorStop(0, alpha(p.melon, 0.3))
  glow.addColorStop(1, alpha(p.melon, 0))
  ctx.fillStyle = glow
  ctx.fillRect(-r * 1.8, -r * 1.8, r * 3.6, r * 3.6)
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

/**
 * The emblem: outlined like everything else, its fill light enough to keep the bubble clear, and
 * one line down the middle, the way a shield is quartered.
 */
function paintEmblem(ctx: CanvasRenderingContext2D, p: Palette): void {
  const e = EMBLEM
  ctx.strokeStyle = p.bubbleEdge
  ctx.lineWidth = 1.4
  ctx.fillStyle = p.bubbleEmblem
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
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, -e * 0.55)
  ctx.lineTo(0, e * 0.62)
  ctx.stroke()
}
