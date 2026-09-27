import { OUTLINE, PICKUP_RADIUS } from '../constants.ts'
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
    if (pickup.kind === 'melon') drawMelon(ctx, p, Math.sin(now / 700 + pickup.seed) * 0.25)
    else drawShieldOrb(ctx, p, now, pickup.seed)
    ctx.restore()
  }
}

/** A melon wedge: green rind, pink flesh, three pips. Rocking gently on its flat side. */
function drawMelon(ctx: CanvasRenderingContext2D, p: Palette, tilt: number): void {
  const r = PICKUP_RADIUS
  ctx.rotate(tilt)
  ctx.lineWidth = OUTLINE
  ctx.strokeStyle = 'rgba(24, 58, 36, 0.55)'

  ctx.fillStyle = p.melonRind
  ctx.beginPath()
  ctx.arc(0, r * 0.45, r, Math.PI, Math.PI * 2)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = p.melon
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

/** The shield pickup: a bubble with a star inside, pulsing so it stands out inside a pipe gap. */
function drawShieldOrb(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  now: number,
  seed: number,
): void {
  const pulse = 1 + Math.sin(now / 260 + seed) * 0.07
  const r = PICKUP_RADIUS * 1.25 * pulse
  const skin = ctx.createRadialGradient(0, 0, r * 0.25, 0, 0, r)
  skin.addColorStop(0, 'rgba(255, 255, 255, 0.2)')
  skin.addColorStop(1, p.bubble)
  ctx.fillStyle = skin
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = p.bubbleEdge
  ctx.lineWidth = 1.6
  ctx.stroke()
  // A short highlight arc is what makes a circle read as a bubble.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, r - 3, Math.PI * 1.15, Math.PI * 1.55)
  ctx.stroke()

  // The glyph is the shield's own violet, never the pipes' blue.
  ctx.fillStyle = p.bubbleEdge
  ctx.beginPath()
  ctx.moveTo(0, -r * 0.55)
  ctx.lineTo(r * 0.45, -r * 0.3)
  ctx.lineTo(r * 0.45, r * 0.15)
  ctx.quadraticCurveTo(r * 0.45, r * 0.6, 0, r * 0.62)
  ctx.quadraticCurveTo(-r * 0.45, r * 0.6, -r * 0.45, r * 0.15)
  ctx.lineTo(-r * 0.45, -r * 0.3)
  ctx.closePath()
  ctx.fill()
}
