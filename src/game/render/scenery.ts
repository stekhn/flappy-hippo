import {
  CLOUD_FALL_DISTANCE,
  CLOUD_FALL_GRAVITY,
  CLOUD_RISE_OMEGA,
  CLOUD_SPIN,
  CLOUD_STAGGER_S,
  GROUND_HEIGHT,
  HAZE_HEIGHT,
  HAZE_NEAR_HEIGHT,
  MOON_RADIUS,
  SCENE_PERIOD,
  SUN_RADIUS,
} from '../constants.ts'
import { mix } from '../palette.ts'
import type { GameState, Palette } from '../types.ts'
import type { World } from '../world.ts'
import type { Layer, LayerCache } from './layers.ts'
import { drawFurniture, paintStreet, STREET_ABOVE, STREET_PERIOD } from './street.ts'

// The backdrop: sky, sun or moon, stars, clouds, two skylines, a hedge line with lamps, and the
// wall the game is played over. Everything that never changes between frames is baked into a
// strip by the LayerCache and blitted (see layers.ts); only the sky bodies are drawn live.

interface Building {
  x: number
  w: number
  h: number
  roof: 'flat' | 'step' | 'spire' | 'antenna'
  windows: boolean[]
  cols: number
  rows: number
}

interface Puff {
  dx: number
  dy: number
  r: number
}

interface Cloud {
  /** Position in scene units; `y` is a share of the sky height so it adapts to the field. */
  x: number
  y: number
  puffs: Puff[]
}

interface Star {
  x: number
  y: number
  r: number
  phase: number
}

interface Lobe {
  dx: number
  dy: number
  r: number
}

interface Bush {
  x: number
  w: number
  h: number
  lobes: Lobe[]
  /** Small lit dabs on the shaded side: leaves catching the light. */
  leaves: Lobe[]
  /** Variation: flipped, a little bigger or smaller, a shade warmer or cooler. */
  mirror: boolean
  scale: number
  tone: number
}

interface Lamp {
  x: number
  h: number
  arms: 'left' | 'right' | 'both'
}

interface Tree {
  x: number
  h: number
  lean: number
  lobes: Lobe[]
  leaves: Lobe[]
  tone: number
}

const WINDOW_W = 3
const WINDOW_H = 4
const WINDOW_GAP = 3
const ROOFS: Building['roof'][] = ['flat', 'flat', 'step', 'spire', 'antenna']

/** Fixed seed, so the skyline is the same on every frame and every visit. */
export function seeded(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function makeSkyline(seed: number, minH: number, maxH: number, withWindows: boolean): Building[] {
  const rnd = seeded(seed)
  const out: Building[] = []
  let x = 0
  while (x < SCENE_PERIOD) {
    const w = 14 + Math.round(rnd() * 30)
    const h = minH + Math.round(rnd() * (maxH - minH))
    const cols = withWindows ? Math.max(1, Math.floor((w - WINDOW_GAP) / (WINDOW_W + WINDOW_GAP))) : 0
    const rows = withWindows ? Math.max(1, Math.floor((h - WINDOW_GAP) / (WINDOW_H + WINDOW_GAP))) : 0
    out.push({
      x,
      w,
      h,
      roof: ROOFS[Math.floor(rnd() * ROOFS.length)],
      windows: Array.from({ length: cols * rows }, () => rnd() > 0.3),
      cols,
      rows,
    })
    x += w + 2 + Math.round(rnd() * 8)
  }
  return out
}

function makeClouds(seed: number, count: number): Cloud[] {
  const rnd = seeded(seed)
  return Array.from({ length: count }, (_, i) => {
    const scale = 0.5 + rnd() * 0.9
    const puffCount = 3 + Math.floor(rnd() * 3)
    const spread = 12 * scale
    const puffs: Puff[] = Array.from({ length: puffCount }, (_, k) => ({
      dx: (k - (puffCount - 1) / 2) * spread + (rnd() - 0.5) * 6 * scale,
      dy: -(4 + rnd() * 6) * scale * (k > 0 && k < puffCount - 1 ? 1 : 0.3),
      r: (7 + rnd() * 7) * scale,
    }))
    return { x: (i + rnd() * 0.7) * (SCENE_PERIOD / count), y: 0.08 + rnd() * 0.42, puffs }
  })
}

function makeStars(seed: number, count: number): Star[] {
  const rnd = seeded(seed)
  return Array.from({ length: count }, () => ({
    x: rnd() * SCENE_PERIOD,
    y: 0.02 + rnd() * 0.55,
    r: 0.6 + rnd() * 1.1,
    phase: rnd() * Math.PI * 2,
  }))
}

/** A hedge line one layer behind the pipes: clusters of rounded lobes, no two bushes alike. */
function makeBushes(seed: number): Bush[] {
  const rnd = seeded(seed)
  const out: Bush[] = []
  let x = rnd() * 60
  while (x < SCENE_PERIOD) {
    const w = 26 + Math.round(rnd() * 36)
    // A third of them stay low, so the hedge is a run of mounds rather than one even wall.
    const low = rnd() < 0.35
    const h = low ? 7 + Math.round(rnd() * 4) : 12 + Math.round(rnd() * 8)
    const count = 3 + Math.floor(rnd() * 3)
    const lobes: Lobe[] = Array.from({ length: count }, (_, k) => {
      const t = (k + 0.5) / count
      // Taller in the middle, so the silhouette is a mound and not a row of balls.
      const rise = 1 - Math.abs(t - 0.5) * 1.2
      return {
        dx: t * w + (rnd() - 0.5) * 5,
        dy: -h * (0.45 + rise * 0.35),
        r: h * (0.55 + rnd() * 0.3) * (0.8 + rise * 0.35),
      }
    })
    const leaves: Lobe[] = Array.from({ length: 2 + Math.floor(rnd() * 3) }, () => ({
      dx: w * (0.15 + rnd() * 0.7),
      dy: -h * (0.15 + rnd() * 0.5),
      r: 1.2 + rnd() * 1,
    }))
    out.push({ x, w, h, lobes, leaves, mirror: rnd() < 0.5, scale: 0.85 + rnd() * 0.35, tone: rnd() * 0.35 })
    x += w + 70 + Math.round(rnd() * 140)
  }
  return out
}

/** Lamp posts along the hedge line, every so often; single arm either way, or a pair. */
function makeLamps(seed: number): Lamp[] {
  const rnd = seeded(seed)
  const out: Lamp[] = []
  let x = 80 + rnd() * 120
  while (x < SCENE_PERIOD - 40) {
    const roll = rnd()
    out.push({ x, h: 30 + Math.round(rnd() * 8), arms: roll < 0.4 ? 'right' : roll < 0.8 ? 'left' : 'both' })
    x += 250 + rnd() * 200
  }
  return out
}

/** Low trees, each rising from behind a bush so the hedge cuts its trunk as it does the lamp posts. */
function makeTrees(seed: number, bushes: Bush[]): Tree[] {
  const rnd = seeded(seed)
  const out: Tree[] = []
  let x = 40 + rnd() * 120
  while (x < SCENE_PERIOD - 60) {
    const bush = bushes.reduce((best, b) => (Math.abs(b.x - x) < Math.abs(best.x - x) ? b : best), bushes[0])
    const at = bush.x + bush.w * bush.scale * (0.25 + rnd() * 0.5)
    const r = 9 + rnd() * 3
    const lobes: Lobe[] = [
      { dx: 0, dy: -r * 0.35, r },
      { dx: -r * 0.85, dy: r * 0.2, r: r * 0.78 },
      { dx: r * 0.9, dy: r * 0.1, r: r * 0.82 },
      { dx: -r * 0.35, dy: r * 0.55, r: r * 0.62 },
      { dx: r * 0.4, dy: r * 0.6, r: r * 0.58 },
    ].map((lobe) => ({ dx: lobe.dx + (rnd() - 0.5) * 2, dy: lobe.dy + (rnd() - 0.5) * 2, r: lobe.r }))
    const leaves: Lobe[] = Array.from({ length: 3 + Math.floor(rnd() * 2) }, () => ({
      dx: (rnd() - 0.5) * r * 1.6,
      dy: (rnd() - 0.6) * r * 1.2,
      r: 1.2 + rnd() * 1,
    }))
    out.push({ x: at, h: 38 + rnd() * 10, lean: (rnd() - 0.5) * 0.14, lobes, leaves, tone: 0.35 + rnd() * 0.3 })
    x = at + 240 + rnd() * 200
  }
  return out
}

const CITY_FAR = makeSkyline(7, 28, 78, false)
const CITY_NEAR = makeSkyline(13, 24, 84, true)
const CLOUDS = makeClouds(21, 7)
const STARS = makeStars(37, 46)
const BUSHES = makeBushes(43)
const LAMPS = makeLamps(83)
const TREES = makeTrees(59, BUSHES)

/** Scene offsets at which a thing must be painted so it also shows where the strip wraps. */
const WRAPS = [-SCENE_PERIOD, 0, SCENE_PERIOD]

// ---- the sky and what moves in it -------------------------------------------------------------

/** Indexed clouds first, sun or moon last. */
export interface SkyMotion {
  drop: number[]
  vel: number[]
}

export function initialSky(): SkyMotion {
  const bodies = CLOUDS.length + 1
  return { drop: Array(bodies).fill(0), vel: Array(bodies).fill(0) }
}

/** On a crash the sky gives up: clouds and the sun drop out of frame, then spring back on restart. */
export function animateSky(sky: SkyMotion, state: GameState, now: number, dt: number): void {
  const falling = state.phase === 'over'
  const since = falling ? state.overAt : state.startedAt
  for (let i = 0; i < sky.drop.length; i++) {
    if (now < since + i * CLOUD_STAGGER_S * 1000) continue
    if (falling) {
      if (sky.drop[i] >= CLOUD_FALL_DISTANCE) {
        sky.vel[i] = 0
        continue
      }
      sky.vel[i] += CLOUD_FALL_GRAVITY * dt
      sky.drop[i] = Math.min(sky.drop[i] + sky.vel[i] * dt, CLOUD_FALL_DISTANCE)
      continue
    }
    if (sky.drop[i] === 0) continue
    // Critically damped spring, so a body caught mid-fall turns around smoothly.
    const accel = -(CLOUD_RISE_OMEGA ** 2) * sky.drop[i] - 2 * CLOUD_RISE_OMEGA * sky.vel[i]
    sky.vel[i] += accel * dt
    sky.drop[i] += sky.vel[i] * dt
    if (Math.abs(sky.drop[i]) < 0.3 && Math.abs(sky.vel[i]) < 5) {
      sky.drop[i] = 0
      sky.vel[i] = 0
    }
  }
}

interface SkyPose {
  drop: number
  alpha: number
  spin: number
}

function skyPose(sky: SkyMotion, i: number): SkyPose {
  const drop = sky.drop[i]
  const fallen = Math.min(drop / CLOUD_FALL_DISTANCE, 1)
  return { drop, alpha: 1 - fallen ** 3, spin: fallen * CLOUD_SPIN * (i % 2 ? 1 : -1) }
}

export function drawSky(ctx: CanvasRenderingContext2D, p: Palette, world: World, cache: LayerCache): void {
  cache.paintSky(ctx, p, world.width, world.height, world.groundY)
}

function cloudSprite(cache: LayerCache, p: Palette, cloud: Cloud, i: number) {
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const puff of cloud.puffs) {
    left = Math.min(left, puff.dx - puff.r)
    right = Math.max(right, puff.dx + puff.r)
    top = Math.min(top, puff.dy - puff.r)
    bottom = Math.max(bottom, puff.dy + puff.r)
  }
  return cache.sprite(`cloud-${i}`, left - 1, top - 1, right - left + 2, bottom - top + 2, (c) => {
    c.fillStyle = p.cloud
    c.beginPath()
    for (const puff of cloud.puffs) {
      c.moveTo(puff.dx + puff.r, puff.dy)
      c.arc(puff.dx, puff.dy, puff.r, 0, Math.PI * 2)
    }
    c.fill()
  })
}

export function drawScenery(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  state: GameState,
  world: World,
  now: number,
  sky: SkyMotion,
  cache: LayerCache,
): void {
  const { scrolled } = state
  if (p.night) drawStars(ctx, p, world, scrolled, now)
  drawOrb(ctx, p, world, skyPose(sky, CLOUDS.length))

  const cloudShift = (scrolled * 0.08) % SCENE_PERIOD
  const sprites = CLOUDS.map((cloud, i) => cloudSprite(cache, p, cloud, i))
  CLOUDS.forEach((cloud, i) => {
    const { drop, alpha, spin } = skyPose(sky, i)
    if (alpha <= 0) return
    const sprite = sprites[i]
    if (alpha < 1) ctx.globalAlpha = alpha
    for (const base of [0, SCENE_PERIOD]) {
      const cx = cloud.x - cloudShift + base
      if (cx < -80 || cx > world.width + 80) continue
      cache.stamp(ctx, sprite, cx, cloud.y * world.groundY + drop, spin)
    }
    if (alpha < 1) ctx.globalAlpha = 1
  })

  // The three still strips, each baked once and shifted at its own pace.
  const far = cache.layer('far', HAZE_HEIGHT, 0, (c, ground) => {
    paintCity(c, p, CITY_FAR, ground, p.cityFar)
    paintHaze(c, ground, HAZE_HEIGHT, p.haze)
  })
  cache.blit(ctx, far, (scrolled * 0.2) % SCENE_PERIOD, world.width)

  const near = cache.layer('near', 112, 0, (c, ground) => {
    paintCity(c, p, CITY_NEAR, ground, p.cityNear)
    paintHaze(c, ground, HAZE_NEAR_HEIGHT, p.hazeNear)
  })
  cache.blit(ctx, near, (scrolled * 0.45) % SCENE_PERIOD, world.width)

  const hedge = cache.layer('hedge', 84, TUCK, (c, ground) => {
    paintTrees(c, p, ground)
    paintLamps(c, p, ground)
    paintBushes(c, p, ground)
  })
  cache.blit(ctx, hedge, (scrolled * 0.7) % SCENE_PERIOD, world.width)
}

export type Strip = 'far' | 'near' | 'hedge' | 'ground'

const STRIPS: Record<Strip, (cache: LayerCache, p: Palette) => Layer> = {
  far: (cache, p) =>
    cache.layer('far', HAZE_HEIGHT, 0, (c, ground) => {
      paintCity(c, p, CITY_FAR, ground, p.cityFar)
      paintHaze(c, ground, HAZE_HEIGHT, p.haze)
    }),
  near: (cache, p) =>
    cache.layer('near', 112, 0, (c, ground) => {
      paintCity(c, p, CITY_NEAR, ground, p.cityNear)
      paintHaze(c, ground, HAZE_NEAR_HEIGHT, p.hazeNear)
    }),
  hedge: (cache, p) =>
    cache.layer('hedge', 84, TUCK, (c, ground) => {
      paintTrees(c, p, ground)
      paintLamps(c, p, ground)
      paintBushes(c, p, ground)
    }),
  ground: (cache, p) =>
    cache.layer('wall', STREET_ABOVE, GROUND_HEIGHT, (c, ground) => paintGround(c, p, ground), STREET_PERIOD),
}

/** One of the backdrop's strips, tiled across `width` from `shift`, for the page around the board. */
export function drawStrip(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  cache: LayerCache,
  strip: Strip,
  width: number,
  shift = 0,
): void {
  const layer = STRIPS[strip](cache, p)
  cache.blit(ctx, layer, ((-shift % layer.period) + layer.period) % layer.period, width)
}

/** One of the sky's clouds, for the page's own sky. */
export function stampCloud(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  cache: LayerCache,
  index: number,
  x: number,
  y: number,
  scale: number,
): void {
  const i = index % CLOUDS.length
  const sprite = cloudSprite(cache, p, CLOUDS[i], i)
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.drawImage(sprite.canvas, sprite.left, sprite.top, sprite.width, sprite.height)
  ctx.restore()
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  world: World,
  scrolled: number,
  now: number,
): void {
  const shift = (scrolled * 0.04) % SCENE_PERIOD
  ctx.save()
  ctx.fillStyle = p.star
  for (const star of STARS) {
    for (const base of [0, SCENE_PERIOD]) {
      const x = star.x - shift + base
      if (x < -4 || x > world.width + 4) continue
      ctx.globalAlpha = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(now / 900 + star.phase))
      ctx.beginPath()
      ctx.arc(x, star.y * world.groundY, star.r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

function drawOrb(ctx: CanvasRenderingContext2D, p: Palette, world: World, pose: SkyPose): void {
  if (pose.alpha <= 0) return
  ctx.save()
  ctx.globalAlpha = pose.alpha
  // Upper right, but left of the pipe that waits on the start screen (see firstPipeX).
  ctx.translate(world.width * 0.72, Math.min(58, world.groundY * 0.18) + pose.drop)
  ctx.rotate(pose.spin)
  if (p.night) drawMoon(ctx, p)
  else drawSun(ctx, p)
  ctx.restore()
}

function drawSun(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.sunHalo
  ctx.beginPath()
  ctx.arc(0, 0, SUN_RADIUS * 1.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = p.sun
  ctx.beginPath()
  ctx.arc(0, 0, SUN_RADIUS, 0, Math.PI * 2)
  ctx.fill()
}

/** The glow goes on last so the crescent's sky-coloured bite does not show in it. */
function drawMoon(ctx: CanvasRenderingContext2D, p: Palette): void {
  const r = MOON_RADIUS
  ctx.fillStyle = p.moon
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = p.sky
  ctx.beginPath()
  ctx.arc(r * 0.45, -r * 0.25, r * 0.85, 0, Math.PI * 2)
  ctx.fill()
  const glow = ctx.createRadialGradient(0, 0, r, 0, 0, r * 2.6)
  glow.addColorStop(0, p.moonGlow)
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(-r * 2.6, -r * 2.6, r * 5.2, r * 5.2)
}

// ---- painters: draw one full period of a strip, in world units, ground line at `ground` -------

function paintHaze(ctx: CanvasRenderingContext2D, ground: number, height: number, color: string): void {
  const haze = ctx.createLinearGradient(0, ground - height, 0, ground)
  haze.addColorStop(0, 'rgba(255, 255, 255, 0)')
  haze.addColorStop(1, color)
  ctx.fillStyle = haze
  ctx.fillRect(0, ground - height, SCENE_PERIOD, height)
}

function paintCity(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  buildings: Building[],
  ground: number,
  color: string,
): void {
  for (const b of buildings) {
    for (const base of WRAPS) {
      const x = Math.round(b.x + base)
      if (x + b.w + 4 < 0 || x - 4 > SCENE_PERIOD) continue
      const top = ground - b.h
      ctx.fillStyle = color
      ctx.fillRect(x, top, b.w, b.h)
      paintRoof(ctx, b, x, top)
      if (b.cols > 0) paintWindows(ctx, p, b, x, top)
    }
  }
}

function paintRoof(ctx: CanvasRenderingContext2D, b: Building, x: number, top: number): void {
  const mid = x + b.w / 2
  switch (b.roof) {
    case 'step': {
      const w = Math.round(b.w * 0.55)
      ctx.fillRect(Math.round(mid - w / 2), top - Math.round(b.h * 0.18), w, Math.round(b.h * 0.18) + 1)
      return
    }
    case 'spire':
      ctx.beginPath()
      ctx.moveTo(x, top)
      ctx.lineTo(mid, top - Math.min(18, b.w))
      ctx.lineTo(x + b.w, top)
      ctx.closePath()
      ctx.fill()
      return
    case 'antenna':
      ctx.fillRect(Math.round(mid) - 1, top - 10, 2, 10)
      return
    case 'flat':
      return
  }
}

function paintWindows(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  b: Building,
  x: number,
  top: number,
): void {
  const gridW = b.cols * (WINDOW_W + WINDOW_GAP) - WINDOW_GAP
  const left = x + Math.round((b.w - gridW) / 2)
  ctx.fillStyle = p.window
  for (let r = 0; r < b.rows; r++) {
    for (let c = 0; c < b.cols; c++) {
      if (!b.windows[r * b.cols + c]) continue
      ctx.fillRect(
        left + c * (WINDOW_W + WINDOW_GAP),
        top + WINDOW_GAP + r * (WINDOW_H + WINDOW_GAP),
        WINDOW_W,
        WINDOW_H,
      )
    }
  }
}

/**
 * Old-town lamps: a plinth, a slender post, an arm that swoops out and curls back on itself, and
 * a tapered lantern hanging from the tip. Some carry the arm to the left, some to the right, some
 * one each way. At night the lanterns are lit and throw a soft glow.
 */
function paintLamps(ctx: CanvasRenderingContext2D, p: Palette, ground: number): void {
  for (const lamp of LAMPS) {
    for (const base of WRAPS) {
      const x = lamp.x + base
      if (x < -40 || x > SCENE_PERIOD + 40) continue
      const top = ground - lamp.h
      const sides = lamp.arms === 'both' ? [1, -1] : lamp.arms === 'right' ? [1] : [-1]

      if (p.night) {
        for (const side of sides) {
          const hx = x + 11 * side
          const glow = ctx.createRadialGradient(hx, top + 1, 2, hx, top + 1, 30)
          glow.addColorStop(0, p.sunHalo)
          glow.addColorStop(1, 'rgba(255, 244, 226, 0)')
          ctx.fillStyle = glow
          ctx.fillRect(hx - 30, top - 29, 60, 60)
        }
      }

      ctx.save()
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = p.lamp
      ctx.fillStyle = p.lamp
      // Plinth and post, the post tapering a touch towards the top.
      ctx.beginPath()
      ctx.roundRect(x - 3.5, ground - 3, 7, 3.5 + TUCK, 1)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(x - 1.6, ground - 3)
      ctx.lineTo(x + 1.6, ground - 3)
      ctx.lineTo(x + 1, top)
      ctx.lineTo(x - 1, top)
      ctx.closePath()
      ctx.fill()
      ctx.beginPath()
      ctx.roundRect(x - 2.2, top - 1, 4.4, 2.6, 1)
      ctx.fill()

      for (const side of sides) {
        ctx.save()
        ctx.translate(x, top)
        ctx.scale(side, 1)
        // The arm: up and out in one swoop, then a curl back under it.
        ctx.lineWidth = 1.7
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.bezierCurveTo(1, -7, 7, -8, 11, -6)
        ctx.stroke()
        ctx.lineWidth = 1.1
        ctx.beginPath()
        ctx.moveTo(4.5, -5.2)
        ctx.bezierCurveTo(8, -5.5, 8.5, -1, 5.5, -1.5)
        ctx.stroke()
        // The lantern: a cap, a tapered glass body, a finial.
        ctx.beginPath()
        ctx.moveTo(11, -6)
        ctx.lineTo(11, -4)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(6.8, -2)
        ctx.lineTo(11, -4.5)
        ctx.lineTo(15.2, -2)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = p.night ? p.sun : p.flower
        ctx.beginPath()
        ctx.moveTo(7.6, -2)
        ctx.lineTo(14.4, -2)
        ctx.lineTo(13.4, 5)
        ctx.lineTo(8.6, 5)
        ctx.closePath()
        ctx.fill()
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.fillStyle = p.lamp
        ctx.beginPath()
        ctx.roundRect(8, 5, 6, 1.6, 0.8)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(11, 7.6, 1, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      ctx.restore()
    }
  }
}

/** How far the edge colour reaches past the foliage, for a silhouette under it. */
const FOLIAGE_EDGE = 1.3

/**
 * A mass of foliage: every lobe again and a little larger in the edge colour for a silhouette,
 * the body in shade, then the same lobes shifted towards the light and clipped to the body, and
 * a few leaves loosely over it. `base` is the block the lobes sit on, for a bush that is solid
 * to the ground rather than a crown on a trunk. Leaves the clip and the alpha to the caller's
 * `restore`.
 */
function paintFoliage(
  ctx: CanvasRenderingContext2D,
  lobes: Lobe[],
  leaves: Lobe[],
  lit: string,
  shade: string,
  edge: string,
  base?: [number, number, number, number],
): void {
  const grow = FOLIAGE_EDGE
  ctx.fillStyle = edge
  ctx.beginPath()
  if (base) ctx.rect(base[0] - grow, base[1], base[2] + grow * 2, base[3] + grow)
  for (const lobe of lobes) {
    ctx.moveTo(lobe.dx + lobe.r + grow, lobe.dy)
    ctx.arc(lobe.dx, lobe.dy, lobe.r + grow, 0, Math.PI * 2)
  }
  ctx.fill()

  const body = new Path2D()
  if (base) body.rect(base[0], base[1], base[2], base[3])
  for (const lobe of lobes) {
    body.moveTo(lobe.dx + lobe.r, lobe.dy)
    body.arc(lobe.dx, lobe.dy, lobe.r, 0, Math.PI * 2)
  }
  ctx.fillStyle = shade
  ctx.fill(body)
  ctx.clip(body)

  ctx.fillStyle = lit
  ctx.beginPath()
  for (const lobe of lobes) {
    const r = lobe.r * 0.72
    ctx.moveTo(lobe.dx - lobe.r * 0.2 + r, lobe.dy - lobe.r * 0.28)
    ctx.arc(lobe.dx - lobe.r * 0.2, lobe.dy - lobe.r * 0.28, r, 0, Math.PI * 2)
  }
  ctx.fill()

  ctx.globalAlpha = 0.8
  ctx.beginPath()
  for (const leaf of leaves) {
    ctx.moveTo(leaf.dx + leaf.r, leaf.dy)
    ctx.ellipse(leaf.dx, leaf.dy, leaf.r, leaf.r * 0.6, -0.5, 0, Math.PI * 2)
  }
  ctx.fill()
}

function paintTrees(ctx: CanvasRenderingContext2D, p: Palette, ground: number): void {
  for (const tree of TREES) {
    const lit = mix(p.bushLit, p.bushShade, tree.tone)
    const shade = mix(p.bushShade, p.bushEdge, tree.tone * 0.5)
    const top = -tree.h
    const tilt = tree.lean * tree.h
    for (const base of WRAPS) {
      const x = tree.x + base
      if (x + 20 < 0 || x - 20 > SCENE_PERIOD) continue
      ctx.save()
      ctx.translate(x, ground)
      ctx.fillStyle = p.clod
      ctx.strokeStyle = p.earthDeep
      ctx.lineWidth = 1.2
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(-2.8, TUCK)
      ctx.lineTo(2.8, TUCK)
      ctx.lineTo(1.6 + tilt, top + 6)
      ctx.lineTo(-1.6 + tilt, top + 6)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = p.earthDeep
      ctx.beginPath()
      ctx.moveTo(0.6, TUCK)
      ctx.lineTo(2.8, TUCK)
      ctx.lineTo(1.6 + tilt, top + 6)
      ctx.lineTo(0.4 + tilt, top + 6)
      ctx.closePath()
      ctx.fill()
      ctx.translate(tilt, top)
      paintFoliage(ctx, tree.lobes, tree.leaves, lit, shade, p.bushEdge)
      ctx.restore()
    }
  }
}

function paintBushes(ctx: CanvasRenderingContext2D, p: Palette, ground: number): void {
  for (const bush of BUSHES) {
    const lit = mix(p.bushLit, p.bushShade, bush.tone)
    const shade = mix(p.bushShade, p.bushEdge, bush.tone * 0.5)
    for (const base of WRAPS) {
      const x = bush.x + base
      if (x + bush.w * bush.scale + 12 < 0 || x - 12 > SCENE_PERIOD) continue
      ctx.save()
      // Each bush is its own instance: flipped or not, scaled about its foot.
      ctx.translate(x + (bush.mirror ? bush.w * bush.scale : 0), ground)
      ctx.scale(bush.mirror ? -bush.scale : bush.scale, bush.scale)
      // The block runs only between the outer lobes' centres, so the ends are always rounded off
      // by a lobe and never a bare corner.
      const first = bush.lobes[0].dx
      const last = bush.lobes[bush.lobes.length - 1].dx
      const block: [number, number, number, number] = [first, -bush.h * 0.6, last - first, bush.h * 0.6 + TUCK]
      paintFoliage(ctx, bush.lobes, bush.leaves, lit, shade, p.bushEdge, block)
      ctx.restore()
    }
  }
}

/** How tall the band of grass is; the earth fills the rest of the ground. */
const GRASS_HEIGHT = 6
/** How far the hedge's bushes and lamp plinths reach below the ground line, tucked under the grass. */
const TUCK = 4

/**
 * The ground: a band of grass with a tufted top edge over earth, the way a side-scroller's
 * ground has always looked. The grass is lit along its top and shaded where it meets the earth;
 * the earth carries a few clods and darkens toward the bottom. The plants stand on the grass.
 */
function paintGround(ctx: CanvasRenderingContext2D, p: Palette, ground: number): void {
  // Earth, with clods scattered on a fixed seed so the strip tiles without a seam.
  ctx.fillStyle = p.earth
  ctx.fillRect(0, ground + GRASS_HEIGHT - 1, STREET_PERIOD, GROUND_HEIGHT - GRASS_HEIGHT + 1)
  ctx.fillStyle = p.earthDeep
  ctx.fillRect(0, ground + GROUND_HEIGHT - 2.5, STREET_PERIOD, 2.5)
  const rnd = seeded(11)
  ctx.fillStyle = p.clod
  for (let x = 8; x < STREET_PERIOD - 8; x += 12 + rnd() * 22) {
    const y = ground + GRASS_HEIGHT + 2 + rnd() * (GROUND_HEIGHT - GRASS_HEIGHT - 5)
    const r = 0.8 + rnd() * 0.9
    ctx.beginPath()
    ctx.ellipse(x, y, r * 1.4, r * 0.85, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  // The grass: one band with a scalloped top, filled lit, then again a touch lower in the
  // middle green, so a lit rim runs along the tufts.
  const band = new Path2D()
  band.moveTo(0, ground + GRASS_HEIGHT)
  band.lineTo(0, ground + 1)
  for (let x = 0; x < STREET_PERIOD; x += 8) {
    band.quadraticCurveTo(x + 2, ground - 0.9, x + 4, ground + 0.5)
    band.quadraticCurveTo(x + 6, ground + 1.5, x + 8, ground + 1)
  }
  band.lineTo(STREET_PERIOD, ground + GRASS_HEIGHT)
  band.closePath()
  ctx.fillStyle = p.grassLit
  ctx.fill(band)
  ctx.save()
  ctx.translate(0, 1.3)
  ctx.fillStyle = p.groundGrass
  ctx.fill(band)
  ctx.restore()
  ctx.fillStyle = p.grassShadow
  ctx.fillRect(0, ground + GRASS_HEIGHT - 1.2, STREET_PERIOD, 1.4)
  // An ink edge along the tufts, as the bushes and the pipes have one.
  const edge = new Path2D()
  edge.moveTo(0, ground + 1)
  for (let x = 0; x < STREET_PERIOD; x += 8) {
    edge.quadraticCurveTo(x + 2, ground - 0.9, x + 4, ground + 0.5)
    edge.quadraticCurveTo(x + 6, ground + 1.5, x + 8, ground + 1)
  }
  ctx.strokeStyle = p.bushEdge
  ctx.lineWidth = 0.9
  ctx.lineJoin = 'round'
  ctx.stroke(edge)

  paintStreet(ctx, p, ground)
}

/**
 * The ground and its plants, baked together, and the furniture on top: they scroll as one at the
 * field's own speed.
 */
export function drawGround(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  world: World,
  scrolled: number,
  round: number,
  now: number,
  cache: LayerCache,
): void {
  const wall = cache.layer('wall', STREET_ABOVE, GROUND_HEIGHT, (c, ground) => paintGround(c, p, ground), STREET_PERIOD)
  const origin = cache.blit(ctx, wall, scrolled % STREET_PERIOD, world.width)
  drawFurniture(ctx, p, origin, Math.floor(scrolled / STREET_PERIOD), round, world.width, world.groundY, now / 1000, cache)
}
