import { HIPPO_RADIUS, INNER_LINE, OUTLINE } from '../constants.ts'
import type { Palette } from '../types.ts'
import { drawEllipse, drawShadedEllipse } from './shapes.ts'

export interface HippoPose {
  x: number
  y: number
  tilt: number
  /** 0..1 through one wing beat. */
  flap: number
  /** Knocked out: wings and ears droop, legs dangle, eyes shut. */
  defeated: boolean
  /** How far the head nods forward around the neck, in radians. 0 in flight. */
  headNod: number
  /** How far the head hangs below its normal place, in world units. 0 in flight. */
  headDrop: number
  shielded: boolean
  /** 0..1 of the invulnerability window left after a shield popped. */
  sparkle: number
}

export function drawHippo(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  pose: HippoPose,
  now: number,
): void {
  const flick = pose.defeated ? 0 : Math.sin(pose.flap * Math.PI)
  // In defeat everything that was held up hangs down. The wing's rest angle is 0.5 and a
  // downstroke swings it negative, so "limp" is further that way than any flap goes.
  const wingAngle = pose.defeated ? -1.15 : 0.5 - flick * 1.2
  const earDroop = pose.defeated ? 0.6 : 0
  const kick = pose.defeated ? 0.35 : (flick - 0.5) * 0.5

  ctx.save()
  ctx.translate(pose.x, pose.y)
  // Just after a shield pops the hippo blinks, the way an arcade sprite signals "still invincible".
  if (pose.sparkle > 0) ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(now / 70))
  ctx.rotate(pose.tilt)
  ctx.lineWidth = OUTLINE
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

  // Drawn before the head, so only the ear's grey tip peeks out
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

  if (pose.shielded) drawBubble(ctx, p, pose, now)
}

/** The shield: a soap bubble with a drifting highlight, so it reads as a skin and not a ring. */
function drawBubble(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  pose: HippoPose,
  now: number,
): void {
  const r = HIPPO_RADIUS + 9 + Math.sin(now / 320) * 1.2
  ctx.save()
  ctx.translate(pose.x, pose.y)
  const skin = ctx.createRadialGradient(0, 0, r * 0.55, 0, 0, r)
  skin.addColorStop(0, 'rgba(255, 255, 255, 0)')
  skin.addColorStop(1, p.bubble)
  ctx.fillStyle = skin
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = p.bubbleEdge
  ctx.lineWidth = 1.6
  ctx.stroke()
  ctx.globalAlpha = 0.8
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.lineWidth = 2
  ctx.beginPath()
  const sheen = now / 900
  ctx.arc(0, 0, r - 2.5, sheen, sheen + 0.7)
  ctx.stroke()
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
  ctx.lineWidth = OUTLINE
}
