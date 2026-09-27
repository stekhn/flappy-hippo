import type { Palette } from '../types.ts'
import type { LayerCache } from './layers.ts'

/**
 * A soap bubble, drawn about the origin: a near-clear skin with a faint tint toward the rim, a
 * thin rim whose light runs round it (the shield's violet into a lilac white, turning with
 * `sheen`), one crisp highlight where the light is and a small one opposite. Whatever is inside
 * stays fully visible; the colour lives in the rim. The hippo's shield and the pickup are the
 * same bubble, so picking one up looks like putting it on. Its gradients are made once per
 * palette (unit-sized, scaled to `r`) and turned with the context, never rebuilt per frame.
 */
export function drawBubbleSkin(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  r: number,
  sheen: number,
  cache?: LayerCache,
): void {
  const makeSkin = () => {
    const skin = ctx.createRadialGradient(0, 0, 0.5, 0, 0, 1)
    skin.addColorStop(0, 'rgba(255, 255, 255, 0)')
    skin.addColorStop(0.75, p.bubbleSkinInner)
    skin.addColorStop(1, p.bubbleSkin)
    return skin
  }
  ctx.save()
  ctx.scale(r, r)
  ctx.fillStyle = cache ? cache.gradient('bubble-skin', makeSkin) : makeSkin()
  ctx.beginPath()
  ctx.arc(0, 0, 1, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  const large = r > 12
  const rimWidth = large ? 1.8 : 1.3
  ctx.save()
  // Safari before 16.2 has no conic gradients; the rim is then plain violet
  if (typeof (ctx as { createConicGradient?: unknown }).createConicGradient === 'function') {
    const makeRim = () => {
      const turn = ctx.createConicGradient(0, 0, 0)
      turn.addColorStop(0, p.bubbleEdge)
      turn.addColorStop(0.22, p.bubbleLilac)
      turn.addColorStop(0.4, p.bubbleEdge)
      turn.addColorStop(0.68, p.bubbleLilac)
      turn.addColorStop(0.82, p.bubbleEdge)
      turn.addColorStop(1, p.bubbleEdge)
      return turn
    }
    ctx.rotate(sheen)
    ctx.strokeStyle = cache ? cache.gradient('bubble-rim', makeRim) : makeRim()
  } else {
    ctx.strokeStyle = p.bubbleEdge
  }
  ctx.lineWidth = rimWidth
  ctx.beginPath()
  ctx.arc(0, 0, r - rimWidth / 2, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

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
