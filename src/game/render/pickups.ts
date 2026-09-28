import { MELON_TILT, OUTLINE, PICKUP_RADIUS } from '../constants.ts'
import { alpha } from '../palette.ts'
import type { Palette, Pickup } from '../types.ts'
import { drawBubbleSkin } from './bubble.ts'
import type { LayerCache } from './layers.ts'

/** How far the melon's glow reaches, and so how big its sprite is. */
const MELON_SPAN = PICKUP_RADIUS * 1.8 + 1
/** The shield emblem is baked at the orb's resting size and scaled with its pulse. */
const EMBLEM = PICKUP_RADIUS * 1.25 * 0.98

export function drawPickups(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  pickups: Pickup[],
  now: number,
  cache: LayerCache,
): void {
  const melon = cache.sprite('melon', -MELON_SPAN, -MELON_SPAN, MELON_SPAN * 2, MELON_SPAN * 2, (c) => paintMelon(c, p))
  const emblem = cache.sprite('shield-emblem', -10, -10, 20, 22, (c) => paintEmblem(c, p))
  const halo = cache.sprite('shield-halo', -MELON_SPAN, -MELON_SPAN, MELON_SPAN * 2, MELON_SPAN * 2, (c) =>
    paintHalo(c, p),
  )
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
      const pulse = 1 + Math.sin(now / 260 + pickup.seed) * 0.07
      cache.stamp(ctx, halo, 0, 0)
      drawBubbleSkin(ctx, p, PICKUP_RADIUS * 1.25 * pulse, now / 900 + pickup.seed, cache, PICKUP_RADIUS * 1.25)
      ctx.scale(pulse, pulse)
      cache.stamp(ctx, emblem, 0, 0)
    }
    ctx.restore()
  }
}

/**
 * A melon wedge: green rind, pink flesh, three pips, in a soft glow of the melon green, as the
 * shield orb has its lime. Painted once about the origin; it rocks and pulses as a whole.
 */
function paintMelon(ctx: CanvasRenderingContext2D, p: Palette): void {
  const r = PICKUP_RADIUS
  const glow = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 1.8)
  glow.addColorStop(0, alpha(p.melon, 0.3))
  glow.addColorStop(1, alpha(p.melon, 0))
  ctx.fillStyle = glow
  ctx.fillRect(-r * 1.8, -r * 1.8, r * 3.6, r * 3.6)
  ctx.rotate(MELON_TILT)
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

  // A thin shine along the rind, on the side the light comes from once the wedge is turned.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)'
  ctx.lineWidth = 1.3
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(0, r * 0.45, r - 1.5, Math.PI * 1.84, Math.PI * 1.98)
  ctx.stroke()
}

function paintHalo(ctx: CanvasRenderingContext2D, p: Palette): void {
  const r = PICKUP_RADIUS
  const glow = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 1.8)
  glow.addColorStop(0, alpha(p.bubbleEdge, 0.35))
  glow.addColorStop(1, alpha(p.bubbleEdge, 0))
  ctx.fillStyle = glow
  ctx.fillRect(-r * 1.8, -r * 1.8, r * 3.6, r * 3.6)
}

function paintEmblem(ctx: CanvasRenderingContext2D, p: Palette): void {
  const e = EMBLEM
  const w = e * 0.5
  const top = -e * 0.58
  const bottom = e * 0.66
  const heater = (scale: number): Path2D => {
    const path = new Path2D()
    const sw = w * scale
    const st = top * scale + e * 0.03 * (1 - scale)
    const sb = bottom * scale
    path.moveTo(-sw, st + e * 0.06)
    path.quadraticCurveTo(0, st - e * 0.04, sw, st + e * 0.06)
    path.lineTo(sw, e * 0.14 * scale)
    path.quadraticCurveTo(sw, e * 0.46 * scale, 0, sb)
    path.quadraticCurveTo(-sw, e * 0.46 * scale, -sw, e * 0.14 * scale)
    path.closePath()
    return path
  }
  const outer = heater(1)
  const inner = heater(0.74)

  ctx.save()
  ctx.shadowColor = 'rgba(6, 20, 60, 0.35)'
  ctx.shadowBlur = 2.4
  ctx.shadowOffsetX = 0.6
  ctx.shadowOffsetY = 1.4
  const body = ctx.createLinearGradient(0, top, 0, bottom)
  body.addColorStop(0, p.shieldRimLit)
  body.addColorStop(1, p.shieldRim)
  ctx.fillStyle = body
  ctx.fill(outer)
  ctx.restore()
  ctx.lineWidth = OUTLINE
  ctx.strokeStyle = 'rgba(5, 18, 56, 0.75)'
  ctx.stroke(outer)

  const face = ctx.createLinearGradient(0, top, 0, bottom)
  face.addColorStop(0, p.shieldFace)
  face.addColorStop(1, p.shieldFaceDeep)
  ctx.fillStyle = face
  ctx.fill(inner)

  ctx.save()
  ctx.clip(inner)
  const y0 = top + e * 0.22
  const y1 = top + e * 0.46
  const t = e * 0.15
  ctx.fillStyle = p.shieldMark
  ctx.beginPath()
  ctx.moveTo(-w, y1)
  ctx.lineTo(0, y0)
  ctx.lineTo(w, y1)
  ctx.lineTo(w, y1 + t)
  ctx.lineTo(0, y0 + t)
  ctx.lineTo(-w, y1 + t)
  ctx.closePath()
  ctx.fill()
  const gloss = ctx.createRadialGradient(-w * 0.35, top + e * 0.28, 0, -w * 0.35, top + e * 0.28, e * 0.6)
  gloss.addColorStop(0, 'rgba(255, 255, 255, 0.5)')
  gloss.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = gloss
  ctx.fill(inner)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)'
  ctx.lineWidth = 0.9
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-w * 0.62, top + e * 0.16)
  ctx.quadraticCurveTo(-w * 0.3, top + e * 0.08, w * 0.25, top + e * 0.09)
  ctx.stroke()
  ctx.restore()
}
