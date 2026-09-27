import { alpha, mix } from '../palette.ts'
import type { Palette } from '../types.ts'

/**
 * A soap bubble, drawn about the origin: a near-clear skin with a faint tint toward the rim, a
 * thin rim whose light runs round it (the shield's violet into a lilac white, turning with
 * `sheen`), one crisp highlight where the light is and a small one opposite. Whatever is inside
 * stays fully visible; the colour lives in the rim. The hippo's shield and the pickup are the
 * same bubble, so picking one up looks like putting it on.
 */
export function drawBubbleSkin(ctx: CanvasRenderingContext2D, p: Palette, r: number, sheen: number): void {
  const skin = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r)
  skin.addColorStop(0, 'rgba(255, 255, 255, 0)')
  skin.addColorStop(0.75, alpha(p.bubbleEdge, 0.05))
  skin.addColorStop(1, alpha(p.bubbleEdge, 0.22))
  ctx.fillStyle = skin
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()

  const large = r > 12
  const rimWidth = large ? 1.8 : 1.3
  let rim: string | CanvasGradient = p.bubbleEdge
  if ('createConicGradient' in ctx) {
    const lilac = mix(p.bubbleEdge, '#ffffff', 0.65)
    const turn = ctx.createConicGradient(sheen, 0, 0)
    turn.addColorStop(0, p.bubbleEdge)
    turn.addColorStop(0.22, lilac)
    turn.addColorStop(0.4, p.bubbleEdge)
    turn.addColorStop(0.68, lilac)
    turn.addColorStop(0.82, p.bubbleEdge)
    turn.addColorStop(1, p.bubbleEdge)
    rim = turn
  }
  ctx.strokeStyle = rim
  ctx.lineWidth = rimWidth
  ctx.beginPath()
  ctx.arc(0, 0, r - rimWidth / 2, 0, Math.PI * 2)
  ctx.stroke()

  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.lineWidth = large ? 2 : 1.3
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.78, Math.PI * 1.1, Math.PI * 1.45)
  ctx.stroke()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
  ctx.beginPath()
  ctx.arc(r * 0.45, r * 0.5, r * 0.07 + 0.6, 0, Math.PI * 2)
  ctx.fill()
}
