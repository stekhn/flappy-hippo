import {
  FLAP_ANIMATION_MS,
  FLOATER_MS,
  INVULNERABLE_MS,
  SHAKE_MS,
  SHIELD_IN_MS,
  SHIELD_POP_MS,
} from '../constants.ts'
import { t as words } from '../../i18n/index.ts'
import type { GameState, Palette } from '../types.ts'
import type { World } from '../world.ts'
import { drawConfetti, drawParticles } from './effects.ts'
import { drawHippo } from './hippo.ts'
import { drawPickups } from './pickups.ts'
import { drawPipes } from './pipes.ts'
import { drawPots } from './pots.ts'
import { drawRoadworks } from './roadworks.ts'
import type { LayerCache } from './layers.ts'
import type { SkyMotion } from './scenery.ts'
import { drawGround, drawScenery, drawSky } from './scenery.ts'

/** The pose a knocked-out hippo settles into: body level, head hanging from the neck. */
export const DEFEAT = { tilt: 0, headNod: 0.7, headDrop: 2 }

/**
 * Paints one frame of the world. Everything that is not the scene lives in the DOM above it.
 * With `effects` off (the viewer asked for reduced motion) confetti and particles stay unpainted.
 * The still backdrop comes from `cache` as baked strips; only what moves is drawn as paths.
 */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  world: World,
  p: Palette,
  sky: SkyMotion,
  now: number,
  effects: boolean,
  cache: LayerCache,
): void {
  // A crash shudders the whole scene for a moment.
  const shake = effects && state.phase === 'over' ? Math.max(0, 1 - (now - state.overAt) / SHAKE_MS) : 0
  ctx.save()
  if (shake > 0) ctx.translate(Math.sin(now / 9) * 4 * shake, Math.cos(now / 7) * 3 * shake)

  drawSky(ctx, p, world, cache)
  drawScenery(ctx, p, state, world, now, sky, cache)
  drawPipes(ctx, p, state.pipes, world, cache)
  drawPickups(ctx, p, state.pickups, now, cache)
  drawGround(ctx, p, world, state.scrolled, state.round, now, cache)
  // On the street, so over the wall: the road works before a moving pipe, and the pots
  drawRoadworks(ctx, p, state.pipes, world, cache)
  drawPots(ctx, p, state.pots, cache)
  if (effects) drawParticles(ctx, p, state.particles)
  // In front of the world, behind the hippo: the party never hides the hero
  if (effects) drawConfetti(ctx, p, state.confetti)

  if (effects) drawFloaters(ctx, p, state, now)

  const idle = state.phase === 'ready'
  const defeated = state.phase === 'over'
  // The beat of a flap flattens the hippo a touch; a long dive stretches it a touch. Kept small:
  // a hippo is not a rubber ball.
  const beat = idle || defeated ? 0 : Math.sin(Math.min((now - state.flappedAt) / FLAP_ANIMATION_MS, 1) * Math.PI)
  const dive = idle || defeated ? 0 : Math.max(0, state.velocity - 250) / 4600
  const stretch = -beat * 0.05 + dive
  const solidLeft = Math.max(state.solidUntil - now, 0)
  // Nose follows the velocity in flight. Knocked out, the body settles level and the head
  // sinks over the next third of a second — see DEFEAT for the pose it settles into.
  const flying = Math.max(-0.5, Math.min(0.7, state.velocity / 600))
  const sink = defeated ? Math.min((now - state.overAt) / 350, 1) : 0
  const tilt = idle ? 0 : defeated ? flying + (DEFEAT.tilt - flying) * sink : flying
  drawHippo(
    ctx,
    p,
    {
      x: world.hippoX,
      y: state.hippoY + (idle ? Math.sin(now / 280) * 5 : 0),
      tilt,
      flap: idle
        ? 0.15 + 0.15 * Math.sin(now / 350)
        : Math.min((now - state.flappedAt) / FLAP_ANIMATION_MS, 1),
      defeated,
      headNod: DEFEAT.headNod * sink,
      headDrop: DEFEAT.headDrop * sink,
      shield: state.charges,
      shieldIn: Math.min((now - state.shieldAt) / SHIELD_IN_MS, 1),
      pop: state.poppedAt > 0 ? Math.max(0, 1 - (now - state.poppedAt) / SHIELD_POP_MS) : 0,
      stretch,
      sparkle: solidLeft / INVULNERABLE_MS,
    },
    now,
    cache,
  )
  ctx.restore()
}

/** "+3" and friends, rising and fading from where they were earned. */
function drawFloaters(ctx: CanvasRenderingContext2D, p: Palette, state: GameState, now: number): void {
  if (state.floaters.length === 0) return
  ctx.save()
  ctx.font = "700 13px Fredoka, 'Nunito', sans-serif"
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  for (const floater of state.floaters) {
    const t = Math.min((now - floater.born) / FLOATER_MS, 1)
    const y = floater.y - t * 26
    ctx.globalAlpha = 1 - t * t
    ctx.lineWidth = 3
    ctx.strokeStyle = p.sky
    const text = floater.kind === 'melon' ? `+${floater.value}` : words.canvas.shield
    ctx.strokeText(text, floater.x, y)
    ctx.fillStyle = floater.kind === 'melon' ? p.melon : p.bubbleEdge
    ctx.fillText(text, floater.x, y)
  }
  ctx.restore()
}
