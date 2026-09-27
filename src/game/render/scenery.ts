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
}

interface Blade {
  dx: number
  h: number
  lean: number
  w: number
  lit: boolean
}

interface Tuft {
  /** Scene x, always on a joint of the top brick row, so the weed grows out of the crack. */
  x: number
  blades: Blade[]
  /** One in five tufts carries a flower at the tip of its tallest blade. */
  flower: boolean
  /** One in four is a low clover instead of blades. */
  clover: boolean
}

interface Crack {
  x: number
  y: number
  points: { dx: number; dy: number }[]
}

/** A hedge line one layer behind the pipes: clusters of rounded lobes, a bush every so often. */
function makeBushes(seed: number): Bush[] {
  const rnd = seeded(seed)
  const out: Bush[] = []
  let x = rnd() * 60
  while (x < SCENE_PERIOD) {
    const w = 26 + Math.round(rnd() * 36)
    const h = 11 + Math.round(rnd() * 9)
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
    out.push({ x, w, h, lobes, leaves })
    x += w + 40 + Math.round(rnd() * 110)
  }
  return out
}

/**
 * Weeds on the wall: tufts of four to seven blades, rooted in the joints between the top row's
 * bricks (the joints are BRICK_WIDTH apart and the scene repeats on a multiple of it, so the
 * roots stay in the cracks however far the wall has scrolled). Never a lawn.
 */
function makeTufts(seed: number): Tuft[] {
  const rnd = seeded(seed)
  const out: Tuft[] = []
  let joint = 1
  const joints = SCENE_PERIOD / BRICK_WIDTH
  while (joint < joints) {
    const count = 4 + Math.floor(rnd() * 4)
    const blades: Blade[] = Array.from({ length: count }, (_, k) => {
      const spread = k - (count - 1) / 2
      return {
        dx: spread * 2 + (rnd() - 0.5) * 1.2,
        h: 6 + rnd() * 8,
        // Outer blades splay outward; every blade has a little lean of its own.
        lean: spread * 0.22 + (rnd() - 0.5) * 0.9,
        w: 1.3 + rnd() * 1,
        lit: rnd() > 0.45,
      }
    })
    const clover = rnd() < 0.25
    out.push({ x: joint * BRICK_WIDTH, blades, flower: !clover && rnd() < 0.2, clover })
    joint += 1 + Math.floor(rnd() * 2.6)
  }
  return out
}

/** Hairline cracks in the odd brick, scrolling with the wall. */
function makeCracks(seed: number): Crack[] {
  const rnd = seeded(seed)
  const out: Crack[] = []
  const bricks = SCENE_PERIOD / BRICK_WIDTH
  for (let b = 0; b < bricks; b++) {
    if (rnd() > 0.16) continue
    const row = Math.floor(rnd() * 2)
    const points = []
    let dx = 0
    let dy = 0
    for (let k = 0; k < 3 + Math.floor(rnd() * 2); k++) {
      dx += 3 + rnd() * 5
      dy += (rnd() - 0.5) * 4
      points.push({ dx, dy })
    }
    out.push({
      x: b * BRICK_WIDTH + (row % 2) * (BRICK_WIDTH / 2) + 4 + rnd() * 12,
      y: row * BRICK_HEIGHT + 2 + rnd() * (BRICK_HEIGHT - 5),
      points,
    })
  }
  return out
}

const CITY_FAR = makeSkyline(7, 28, 78, false)
const CITY_NEAR = makeSkyline(13, 24, 84, true)
const CLOUDS = makeClouds(21, 7)
const STARS = makeStars(37, 46)
const BUSHES = makeBushes(43)
const TUFTS = makeTufts(59)
const CRACKS = makeCracks(71)

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
  drawCity(ctx, p, CITY_NEAR, world, (scrolled * 0.45) % SCENE_PERIOD, p.cityNear)
  drawHaze(ctx, world, HAZE_NEAR_HEIGHT, p.hazeNear)
  drawBushes(ctx, p, world, (scrolled * 0.7) % SCENE_PERIOD)
  // In front of the skyline and its haze, behind the pipes: a party, not a rumour of one.
  if (effects) drawFireworks(ctx, p, state.fireworks, world, now)
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

function drawBushes(ctx: CanvasRenderingContext2D, p: Palette, world: World, shift: number): void {
  const base = world.groundY
  const EDGE = 1.3
  for (const bush of BUSHES) {
    for (const offset of [0, SCENE_PERIOD]) {
      const x = bush.x - shift + offset
      if (x + bush.w + 12 < 0 || x - 12 > world.width) continue

      // Silhouette outline: every lobe again, a little larger, in the edge colour underneath.
      ctx.fillStyle = p.bushEdge
      ctx.beginPath()
      ctx.rect(x - EDGE, base - bush.h, bush.w + EDGE * 2, bush.h)
      for (const lobe of bush.lobes) {
        ctx.moveTo(x + lobe.dx + lobe.r + EDGE, base + lobe.dy)
        ctx.arc(x + lobe.dx, base + lobe.dy, lobe.r + EDGE, 0, Math.PI * 2)
      }
      ctx.fill()

      // The body in shade, then the lit side: the same lobes shifted towards the light, clipped
      // to the body so nothing pokes out of the silhouette.
      const body = new Path2D()
      body.rect(x, base - bush.h, bush.w, bush.h)
      for (const lobe of bush.lobes) {
        body.moveTo(x + lobe.dx + lobe.r, base + lobe.dy)
        body.arc(x + lobe.dx, base + lobe.dy, lobe.r, 0, Math.PI * 2)
      }
      ctx.fillStyle = p.bushShade
      ctx.fill(body)
      ctx.save()
      ctx.clip(body)
      ctx.fillStyle = p.bushLit
      ctx.beginPath()
      for (const lobe of bush.lobes) {
        const r = lobe.r * 0.72
        ctx.moveTo(x + lobe.dx - lobe.r * 0.2 + r, base + lobe.dy - lobe.r * 0.28)
        ctx.arc(x + lobe.dx - lobe.r * 0.2, base + lobe.dy - lobe.r * 0.28, r, 0, Math.PI * 2)
      }
      ctx.fill()
      // A few leaves catching light on the shaded side.
      ctx.globalAlpha = 0.8
      ctx.beginPath()
      for (const leaf of bush.leaves) {
        ctx.moveTo(x + leaf.dx + leaf.r, base + leaf.dy)
        ctx.ellipse(x + leaf.dx, base + leaf.dy, leaf.r, leaf.r * 0.6, -0.5, 0, Math.PI * 2)
      }
      ctx.fill()
      ctx.restore()
    }
  }
}

/**
 * Weeds in the wall's joints, scrolling with the wall: a dark seam where the mortar has gone,
 * shade blades, lit blades over them, and now and then a flower or a clover instead.
 */
export function drawGreenery(ctx: CanvasRenderingContext2D, p: Palette, world: World, scrolled: number): void {
  const base = world.groundY
  const shift = scrolled % SCENE_PERIOD
  ctx.save()
  ctx.lineCap = 'round'
  for (const tuft of TUFTS) {
    for (const offset of [0, SCENE_PERIOD]) {
      const x = tuft.x - shift + offset
      if (x < -16 || x > world.width + 16) continue

      // The joint has opened up a little where the roots are.
      ctx.fillStyle = p.groundLine
      ctx.fillRect(x - 1.5, base, 3, 6)

      if (tuft.clover) {
        drawClover(ctx, p, x, base)
        continue
      }

      for (const pass of [false, true]) {
        ctx.strokeStyle = pass ? p.grassLit : p.grassShade
        for (const blade of tuft.blades) {
          if (blade.lit !== pass) continue
          ctx.lineWidth = blade.w
          ctx.beginPath()
          ctx.moveTo(x + blade.dx * 0.6, base + 3)
          ctx.quadraticCurveTo(
            x + blade.dx + blade.lean * 2.5,
            base - blade.h * 0.55,
            x + blade.dx + blade.lean * 6,
            base - blade.h,
          )
          ctx.stroke()
        }
      }

      if (tuft.flower) {
        const tall = tuft.blades.reduce((a, b) => (b.h > a.h ? b : a))
        const fx = x + tall.dx + tall.lean * 6
        const fy = base - tall.h - 1
        ctx.fillStyle = p.flower
        ctx.beginPath()
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2
          ctx.moveTo(fx + Math.cos(a) * 1.6 + 1.1, fy + Math.sin(a) * 1.6)
          ctx.arc(fx + Math.cos(a) * 1.6, fy + Math.sin(a) * 1.6, 1.1, 0, Math.PI * 2)
        }
        ctx.fill()
        ctx.fillStyle = p.flowerCenter
        ctx.beginPath()
        ctx.arc(fx, fy, 0.9, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  ctx.restore()
}

/** A low clover: three stalks from the joint, each with a small three-leaf head. */
function drawClover(ctx: CanvasRenderingContext2D, p: Palette, x: number, base: number): void {
  ctx.strokeStyle = p.grassShade
  ctx.lineWidth = 1
  const heads: [number, number][] = [
    [-4, 4.5],
    [0.5, 6.5],
    [4.5, 4],
  ]
  for (const [hx, hy] of heads) {
    ctx.beginPath()
    ctx.moveTo(x, base + 2)
    ctx.quadraticCurveTo(x + hx * 0.5, base - hy * 0.5, x + hx, base - hy)
    ctx.stroke()
  }
  for (const [i, [hx, hy]] of heads.entries()) {
    ctx.fillStyle = i === 1 ? p.grassLit : p.grassShade
    ctx.beginPath()
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + (k / 3) * Math.PI * 2
      ctx.moveTo(x + hx + Math.cos(a) * 1.3 + 1.3, base - hy + Math.sin(a) * 1.3)
      ctx.arc(x + hx + Math.cos(a) * 1.3, base - hy + Math.sin(a) * 1.3, 1.3, 0, Math.PI * 2)
    }
    ctx.fill()
  }
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
  scrolled: number,
): void {
  const offset = scrolled % BRICK_WIDTH
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

  // A hairline crack in the odd brick: texture, not a feature.
  const shift = scrolled % SCENE_PERIOD
  ctx.strokeStyle = p.groundLine
  ctx.lineWidth = 1
  ctx.beginPath()
  for (const crack of CRACKS) {
    for (const base of [0, SCENE_PERIOD]) {
      const x = crack.x - shift + base
      if (x < -20 || x > world.width) continue
      ctx.moveTo(x, top + crack.y)
      for (const point of crack.points) ctx.lineTo(x + point.dx, top + crack.y + point.dy)
    }
  }
  ctx.stroke()
}
