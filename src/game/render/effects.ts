import { tintColor } from '../palette.ts'
import type { Confetti, Palette, Particle } from '../types.ts'

/**
 * Confetti: flat filled pieces in the game's own colours, each flipping about its long axis as
 * it tumbles, so a piece thins to a line and back the way paper does, its back a shade darker.
 * Outlined like everything else, and faded out over its last half second.
 */
export function drawConfetti(ctx: CanvasRenderingContext2D, p: Palette, pieces: Confetti[]): void {
  ctx.save()
  ctx.lineWidth = 0.6
  for (const piece of pieces) {
    const tint = piece.tint % p.confetti.length
    const face = Math.cos(piece.flip)
    const thin = Math.max(Math.abs(face), 0.15)
    ctx.globalAlpha = Math.min(piece.life / 0.5, 1)
    ctx.save()
    ctx.translate(piece.x, piece.y)
    ctx.rotate(piece.angle)
    ctx.fillStyle = face >= 0 ? p.confetti[tint] : p.confettiBack[tint]
    ctx.strokeStyle = p.confettiEdge[tint]
    ctx.beginPath()
    if (piece.round) ctx.ellipse(0, 0, piece.w / 2, (piece.h / 2) * thin, 0, 0, Math.PI * 2)
    else ctx.rect(-piece.w / 2, (-piece.h / 2) * thin, piece.w, piece.h * thin)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }
  ctx.restore()
}

export function drawParticles(ctx: CanvasRenderingContext2D, p: Palette, particles: Particle[]): void {
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
