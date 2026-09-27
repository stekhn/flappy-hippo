import {
  BRICK_HEIGHT,
  BRICK_WIDTH,
  CLOUD_FALL_DISTANCE,
  CLOUD_FALL_GRAVITY,
  CLOUD_RISE_OMEGA,
  CLOUD_SPIN,
  CLOUD_STAGGER_S,
  HAZE_HEIGHT,
  HAZE_NEAR_HEIGHT,
  MOON_RADIUS,
  SCENE_PERIOD,
  SUN_RADIUS,
} from '../constants.ts'
import type { GameState, Palette } from '../types.ts'
import type { World } from '../world.ts'
import { drawFireworks } from './effects.ts'

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

const WINDOW_W = 3
const WINDOW_H = 4
const WINDOW_GAP = 3
const ROOFS: Building['roof'][] = ['flat', 'flat', 'step', 'spire', 'antenna']

/** Fixed seed, so the skyline is the same on every frame and every visit. */
function seeded(seed: number): () => number {
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

const CITY_FAR = makeSkyline(7, 28, 78, false)
const CITY_NEAR = makeSkyline(13, 24, 84, true)
const CLOUDS = makeClouds(21, 7)
const STARS = makeStars(37, 46)

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
    // Critically damped spring, so a body caught mid-fall turns around smoothly
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

export function drawSky(ctx: CanvasRenderingContext2D, p: Palette, world: World): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, world.groundY)
  gradient.addColorStop(0, p.sky)
  gradient.addColorStop(1, p.skyLow)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, world.width, world.height)
}

export function drawScenery(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  state: GameState,
  world: World,
  now: number,
  sky: SkyMotion,
  effects: boolean,
): void {
  const { scrolled } = state
  if (p.night) drawStars(ctx, p, world, scrolled, now)
  drawOrb(ctx, p, world, skyPose(sky, CLOUDS.length))

  ctx.fillStyle = p.cloud
  const cloudShift = (scrolled * 0.08) % SCENE_PERIOD
  CLOUDS.forEach((cloud, i) => {
    const { drop, alpha, spin } = skyPose(sky, i)
    if (alpha <= 0) return
    for (const base of [0, SCENE_PERIOD]) {
      const cx = cloud.x - cloudShift + base
      if (cx < -80 || cx > world.width + 80) continue
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.translate(cx, cloud.y * world.groundY + drop)
      ctx.rotate(spin)
      ctx.beginPath()
      for (const puff of cloud.puffs) {
        ctx.moveTo(puff.dx + puff.r, puff.dy)
        ctx.arc(puff.dx, puff.dy, puff.r, 0, Math.PI * 2)
      }
      ctx.fill()
      ctx.restore()
    }
  })

  drawCity(ctx, p, CITY_FAR, world, (scrolled * 0.2) % SCENE_PERIOD, p.cityFar)
  drawHaze(ctx, world, HAZE_HEIGHT, p.haze)
  if (effects) drawFireworks(ctx, p, state.fireworks, world, now)
  drawCity(ctx, p, CITY_NEAR, world, (scrolled * 0.45) % SCENE_PERIOD, p.cityNear)
  drawHaze(ctx, world, HAZE_NEAR_HEIGHT, p.hazeNear)
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

function drawHaze(ctx: CanvasRenderingContext2D, world: World, height: number, color: string): void {
  const haze = ctx.createLinearGradient(0, world.groundY - height, 0, world.groundY)
  haze.addColorStop(0, 'rgba(255, 255, 255, 0)')
  haze.addColorStop(1, color)
  ctx.fillStyle = haze
  ctx.fillRect(0, world.groundY - height, world.width, height)
}

function drawOrb(ctx: CanvasRenderingContext2D, p: Palette, world: World, pose: SkyPose): void {
  if (pose.alpha <= 0) return
  ctx.save()
  ctx.globalAlpha = pose.alpha
  // Upper right, but left of the pipe that waits on the start screen (see firstPipeX)
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

function drawCity(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  buildings: Building[],
  world: World,
  shift: number,
  color: string,
): void {
  for (const b of buildings) {
    for (const base of [0, SCENE_PERIOD]) {
      const x = Math.round(b.x - shift + base)
      if (x + b.w + 4 < 0 || x - 4 > world.width) continue
      const top = world.groundY - b.h
      ctx.fillStyle = color
      ctx.fillRect(x, top, b.w, b.h)
      drawRoof(ctx, b, x, top)
      if (b.cols > 0) drawWindows(ctx, p, b, x, top)
    }
  }
}

function drawRoof(ctx: CanvasRenderingContext2D, b: Building, x: number, top: number): void {
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

function drawWindows(
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

export function drawGround(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  world: World,
  offset: number,
): void {
  const top = world.groundY
  const height = world.height - top
  ctx.fillStyle = p.ground
  ctx.fillRect(0, top, world.width, height)

  // Dark joints plus a light line inside each brick's top and left edge read as a bevel
  const joints = new Path2D()
  const edges = new Path2D()
  for (let row = 0; row * BRICK_HEIGHT < height; row++) {
    const y = top + row * BRICK_HEIGHT + 0.5
    joints.moveTo(0, y)
    joints.lineTo(world.width, y)
    edges.moveTo(0, y + 1)
    edges.lineTo(world.width, y + 1)
    const shift = (row % 2) * (BRICK_WIDTH / 2) - offset
    const start = (((shift % BRICK_WIDTH) + BRICK_WIDTH) % BRICK_WIDTH) - BRICK_WIDTH
    for (let x = start; x < world.width; x += BRICK_WIDTH) {
      joints.moveTo(x + 0.5, y)
      joints.lineTo(x + 0.5, y + BRICK_HEIGHT)
      edges.moveTo(x + 1.5, y + 1)
      edges.lineTo(x + 1.5, y + BRICK_HEIGHT)
    }
  }
  ctx.lineWidth = 1
  ctx.strokeStyle = p.groundLine
  ctx.stroke(joints)
  ctx.strokeStyle = p.groundHighlight
  ctx.stroke(edges)
}
