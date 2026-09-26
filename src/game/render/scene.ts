import { BRICK_WIDTH, FLAP_ANIMATION_MS, INVULNERABLE_MS } from '../constants.ts'
import type { GameState, Palette } from '../types.ts'
import type { World } from '../world.ts'
import { drawParticles } from './effects.ts'
import { drawHippo } from './hippo.ts'
import { drawPickups } from './pickups.ts'
import { drawPipes } from './pipes.ts'
import type { SkyMotion } from './scenery.ts'
import { drawGround, drawScenery, drawSky } from './scenery.ts'

/** Paints one frame of the world. Everything that is not the scene lives in the DOM above it. */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  world: World,
  p: Palette,
  sky: SkyMotion,
  now: number,
): void {
  drawSky(ctx, p, world)
  drawScenery(ctx, p, state, world, now, sky)
  drawPipes(ctx, p, state.pipes, world)
  drawPickups(ctx, p, state.pickups, now)
  drawGround(ctx, p, world, state.scrolled % BRICK_WIDTH)
  drawParticles(ctx, p, state.particles)

  const idle = state.phase === 'ready'
  const solidLeft = Math.max(state.solidUntil - now, 0)
  drawHippo(
    ctx,
    p,
    {
      x: world.hippoX,
      y: state.hippoY + (idle ? Math.sin(now / 280) * 5 : 0),
      tilt: idle ? 0 : Math.max(-0.5, Math.min(0.7, state.velocity / 600)),
      flap: idle
        ? 0.15 + 0.15 * Math.sin(now / 350)
        : Math.min((now - state.flappedAt) / FLAP_ANIMATION_MS, 1),
      eyesClosed: state.phase === 'over',
      shielded: state.shielded,
      sparkle: solidLeft / INVULNERABLE_MS,
    },
    now,
  )
}
