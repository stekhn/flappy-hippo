import { HIPPO_DRAW_SCALE, HIPPO_OUTLINE, HIPPO_RADIUS, INNER_LINE } from '../constants.ts'
import type { Palette } from '../types.ts'
import { drawBubbleSkin } from './bubble.ts'
import type { LayerCache } from './layers.ts'
import { drawEllipse, drawShadedEllipse } from './shapes.ts'

/** The bubble's radius: the drawn hippo, snout and feet included, with a little air around it. */
const BUBBLE_RADIUS = HIPPO_RADIUS + 13

export interface HippoPose {
  x: number
  y: number
  tilt: number
  /** 0..1 through one wing beat. */
  flap: number
  /** Knocked out: wings and ears droop, legs dangle, eyes shut. */
  defeated: boolean
  /** Shield charges in hand: one bubble round the hippo, a small one trailing for each beyond the first. */
  shield: number
  /** 0..1 as a freshly picked-up bubble grows in; 1 once it is there. */
  shieldIn: number
  /** 0..1 through the crack ring of a bubble that just popped; 0 when none is popping. */
  pop: number
  /** Squash-and-stretch: negative on the beat of a flap (wide and flat), positive in a dive (tall). */
  stretch: number
  /** How far the head nods forward around the neck, in radians. 0 in flight. */
  headNod: number
  /** How far the head hangs below its normal place, in world units. 0 in flight. */
  headDrop: number
  /** 0..1 of the invulnerability window left after a shield popped. */
  sparkle: number
}

export function drawHippo(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  pose: HippoPose,
  now: number,
  cache?: LayerCache,
): void {
  const flick = pose.defeated ? 0 : Math.sin(pose.flap * Math.PI)
  // In defeat everything that was held up hangs down. The wing's rest angle is 0.5 and a
  // downstroke swings it negative, so "limp" is further that way than any flap goes.
  const wingAngle = pose.defeated ? -1.15 : 0.5 - flick * 1.2
  const earDroop = pose.defeated ? 0.6 : 0
  const kick = pose.defeated ? 0.35 : (flick - 0.5) * 0.5

  if (pose.pop > 0) drawCrack(ctx, p, pose)
  if (pose.shield > 0) drawGlow(ctx, p, pose, cache)

  ctx.save()
  ctx.translate(pose.x, pose.y)
  // Just after a shield pops the hippo blinks, the way an arcade sprite signals "still invincible".
  if (pose.sparkle > 0) ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(now / 70))
  ctx.rotate(pose.tilt)
  ctx.scale(HIPPO_DRAW_SCALE * (1 - pose.stretch * 0.5), HIPPO_DRAW_SCALE * (1 + pose.stretch))
  ctx.lineWidth = HIPPO_OUTLINE
  ctx.strokeStyle = p.hippoDark

  ctx.fillStyle = p.hippoDark
  drawLeg(ctx, -12, 6, kick)
  drawLeg(ctx, 0, 7, pose.defeated ? kick : -kick)

  drawShadedEllipse(ctx, p, -6, 0, 17, 12, -2.4, -3.2)

  ctx.save()
  ctx.translate(-10, -4)
  ctx.rotate(wingAngle)
  ctx.fillStyle = p.wing
  drawWing(ctx)
  ctx.restore()

  // The head is one group hung from the neck, so a nod turns ears, snout and eyes together.
  ctx.save()
  ctx.translate(4, -2 + pose.headDrop)
  ctx.rotate(pose.headNod)

  // Drawn before the head, so only the ear's grey tip peeks out.
  ctx.save()
  ctx.translate(10.7, -9)
  ctx.rotate(-0.08 + flick * 0.8 - earDroop)
  ctx.fillStyle = p.hippoBody
  drawEllipse(ctx, 0, 0, 2.6, 3.8, true)
  ctx.restore()

  drawShadedEllipse(ctx, p, 6, -1, 11, 9, -1.8, -2.6)

  ctx.save()
  ctx.translate(4, -9)
  ctx.rotate(-0.06 - flick * 0.8 - earDroop)
  ctx.fillStyle = p.hippoBody
  drawEllipse(ctx, 0, 0, 3, 4, true)
  ctx.fillStyle = p.hippoEar
  drawEllipse(ctx, 0, 0.5, 1.5, 2)
  ctx.restore()

  ctx.fillStyle = p.hippoLight
  drawEllipse(ctx, 12, 3, 8, 6, true)
  ctx.fillStyle = p.hippoDark
  drawEllipse(ctx, 15, 0, 1.3, 1.3)
  drawEllipse(ctx, 10.6, -0.15, 1.3, 1.3)

  // Eyes shut in defeat: the lids are just the body colour over the whites.
  ctx.fillStyle = pose.defeated ? p.hippoBody : '#ffffff'
  drawEllipse(ctx, 7.4, -4.9, 2.2, 2.2, true)
  drawEllipse(ctx, 12.6, -5.5, 2.2, 2.2, true)
  if (!pose.defeated) {
    ctx.fillStyle = p.hippoDark
    drawEllipse(ctx, 8.1, -4.9, 1, 1)
    drawEllipse(ctx, 13.3, -5.5, 1, 1)
  }
  ctx.restore()

  ctx.restore()

  if (pose.shield > 0) drawBubble(ctx, p, pose, now, cache)
}

/** A soft violet halo behind a shielded hippo: "this one can take a hit", visible at a glance. */
function drawGlow(ctx: CanvasRenderingContext2D, p: Palette, pose: HippoPose, cache?: LayerCache): void {
  const r = BUBBLE_RADIUS * 1.9
  const make = () => {
    const glow = ctx.createRadialGradient(0, 0, HIPPO_RADIUS, 0, 0, r)
    glow.addColorStop(0, p.bubbleGlow)
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
    return glow
  }
  ctx.save()
  ctx.translate(pose.x, pose.y)
  // Faint: a strong halo would fog the bubble up.
  ctx.globalAlpha = 0.25 * pose.shieldIn
  ctx.fillStyle = cache ? cache.gradient('shield-glow', make) : make()
  ctx.fillRect(-r, -r, r * 2, r * 2)
  ctx.restore()
}

/** The bubble breaking: a ring that flashes out and fades, with a few splinters along it. */
function drawCrack(ctx: CanvasRenderingContext2D, p: Palette, pose: HippoPose): void {
  const t = pose.pop
  const r = BUBBLE_RADIUS + t * 22
  ctx.save()
  ctx.translate(pose.x, pose.y)
  ctx.globalAlpha = (1 - t) * 0.95
  ctx.strokeStyle = p.shieldInk
  ctx.lineWidth = 4 * (1 - t) + 1
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 1.8
  ctx.beginPath()
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.4
    ctx.moveTo(Math.cos(a) * (r - 6), Math.sin(a) * (r - 6))
    ctx.lineTo(Math.cos(a + 0.18) * (r + 2), Math.sin(a + 0.18) * (r + 2))
  }
  ctx.stroke()
  ctx.restore()
}

/** The shield: a soap bubble round the hippo; spare charges trail behind as bubbles of their own. */
function drawBubble(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  pose: HippoPose,
  now: number,
  cache?: LayerCache,
): void {
  // Grows in with a little overshoot when just picked up (ease-out-back).
  const t = Math.min(Math.max(pose.shieldIn, 0), 1) - 1
  const grow = 1 + 2.70158 * t * t * t + 1.70158 * t * t
  const r = (BUBBLE_RADIUS + Math.sin(now / 320) * 1.2) * Math.max(grow, 0.05)
  ctx.save()
  ctx.translate(pose.x, pose.y)
  drawBubbleSkin(ctx, p, r, now / 900, cache, BUBBLE_RADIUS)
  for (let i = 1; i < pose.shield; i++) {
    const bob = Math.sin(now / 340 + i * 1.7) * 2
    ctx.save()
    ctx.translate(-r - 5 - (i - 1) * 12, 9 + (i - 1) * 4 + bob)
    drawBubbleSkin(ctx, p, 5.2, now / 700 + i, cache)
    ctx.restore()
  }
  ctx.restore()
}

function drawLeg(ctx: CanvasRenderingContext2D, x: number, hipY: number, angle: number): void {
  ctx.save()
  ctx.translate(x, hipY)
  ctx.rotate(angle)
  drawEllipse(ctx, 0, 5, 3.5, 5)
  ctx.restore()
}

function drawWing(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath()
  ctx.moveTo(1, -2)
  ctx.bezierCurveTo(-4.33, -6, -12.41, -5.76, -13.96, -4.65)
  ctx.bezierCurveTo(-15.48, -3.58, -12.67, -0.67, -10, 0)
  ctx.bezierCurveTo(-11.33, 2.67, -10.17, 3.83, -6.5, 3.5)
  ctx.bezierCurveTo(-6.17, 5.17, -2.25, 4.92, -1, 4)
  ctx.bezierCurveTo(0.25, 3.08, 1.67, 0.67, 1, -2)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.lineWidth = INNER_LINE
  ctx.beginPath()
  ctx.moveTo(1.22, -0.72)
  ctx.bezierCurveTo(-2.78, -2.06, -6.29, -2.11, -10.27, -0.07)
  ctx.moveTo(0.81, 0.43)
  ctx.bezierCurveTo(-1.85, 0.43, -4.98, 1.16, -6.5, 3.5)
  ctx.stroke()
  ctx.lineWidth = HIPPO_OUTLINE
}
