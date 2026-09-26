import { ROCKET_BURST_MS, ROCKET_RISE_MS } from '../constants.ts'
import { tintColor } from '../palette.ts'
import type { Palette, Particle, Rocket } from '../types.ts'
import type { World } from '../world.ts'
import { easeOut } from './shapes.ts'

export function drawFireworks(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  rockets: Rocket[],
  world: World,
  now: number,
): void {
  const launchY = world.groundY
  ctx.save()
  ctx.strokeStyle = p.firework
  ctx.fillStyle = p.firework
  ctx.lineCap = 'round'
  for (const rocket of rockets) {
    const t = now - rocket.launchAt
    if (t < 0 || t > ROCKET_RISE_MS + ROCKET_BURST_MS) continue
    if (t < ROCKET_RISE_MS) {
      const u = t / ROCKET_RISE_MS
      const [x, y] = rocketPos(rocket, launchY, u)
      const [tx, ty] = rocketPos(rocket, launchY, Math.max(0, u - 0.1))
      ctx.lineWidth = 1.5
      ctx.globalAlpha = 0.4
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      ctx.lineTo(x, y)
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.beginPath()
      ctx.arc(x, y, 1.8, 0, Math.PI * 2)
      ctx.fill()
      continue
    }
    const burstX = rocket.x + rocket.drift
    // Each spark is a streak from where it was a moment ago to where it is now, sagging under
    // gravity, so the burst reads as radial arcs
    const u = (t - ROCKET_RISE_MS) / ROCKET_BURST_MS
    const tail = Math.max(0, u - 0.2)
    ctx.globalAlpha = 1 - u
    ctx.lineWidth = 2
    ctx.beginPath()
    for (const spark of rocket.sparks) {
      const dx = Math.cos(spark.angle) * spark.speed
      const dy = Math.sin(spark.angle) * spark.speed
      ctx.moveTo(burstX + dx * easeOut(tail), rocket.peakY + dy * easeOut(tail) + 28 * tail * tail)
      ctx.lineTo(burstX + dx * easeOut(u), rocket.peakY + dy * easeOut(u) + 28 * u * u)
    }
    ctx.stroke()
  }
  ctx.restore()
}

function rocketPos(rocket: Rocket, launchY: number, u: number): [number, number] {
  return [rocket.x + rocket.drift * u * u, launchY + (rocket.peakY - launchY) * easeOut(u)]
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  particles: Particle[],
): void {
  ctx.save()
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(particle.life / particle.maxLife, 0)
    ctx.fillStyle = tintColor(p, particle.tint)
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}
