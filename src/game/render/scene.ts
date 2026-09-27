import { FLAP_ANIMATION_MS, INVULNERABLE_MS } from '../constants.ts'
import type { GameState, Palette } from '../types.ts'
import type { World } from '../world.ts'
import { drawParticles } from './effects.ts'
import { drawHippo } from './hippo.ts'
import { drawPickups } from './pickups.ts'
import { drawPipes } from './pipes.ts'
import type { SkyMotion } from './scenery.ts'
import { drawGround, drawScenery, drawSky } from './scenery.ts'
import { drawStreet } from './street.ts'

/** The pose a knocked-out hippo settles into: body level, head hanging from the neck. */
export const DEFEAT = { tilt: 0, headNod: 0.7, headDrop: 2 }

/**
 * Paints one frame of the world. Everything that is not the scene lives in the DOM above it.
 * With `effects` off (the viewer asked for reduced motion) fireworks and particles stay unpainted.
 */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  world: World,
  p: Palette,
  sky: SkyMotion,
  now: number,
  effects = true,
): void {
  drawSky(ctx, p, world)
  drawScenery(ctx, p, state, world, now, sky, effects)
  drawPipes(ctx, p, state.pipes, world)
  drawPickups(ctx, p, state.pickups, now)
  drawGround(ctx, p, world, state.scrolled)
  drawStreet(ctx, p, world, state.scrolled)
  if (effects) drawParticles(ctx, p, state.particles)

  const idle = state.phase === 'ready'
  const defeated = state.phase === 'over'
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
      sparkle: solidLeft / INVULNERABLE_MS,
    },
    now,
  )
}
