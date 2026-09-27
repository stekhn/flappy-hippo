// A contact sheet of hippo poses, drawn by the real renderer, for choosing how a knocked-out hippo
// should look. Open /src/dev/poses.html on the dev server. The values that win go into DEFEAT in
// src/game/render/scene.ts.

import { resolvePalette } from '../game/palette.ts'
import { drawHippo } from '../game/render/hippo.ts'
import type { HippoPose } from '../game/render/hippo.ts'

interface Variant {
  label: string
  note: string
  pose: Partial<HippoPose>
}

const FLIGHT: HippoPose = {
  x: 0,
  y: 0,
  tilt: 0,
  flap: 0.1,
  defeated: false,
  shield: 0,
  shieldIn: 1,
  pop: 0,
  stretch: 0,
  sparkle: 0,
  headNod: 0,
  headDrop: 0,
}

const VARIANTS: Variant[] = [
  { label: 'Flug', note: 'zum Vergleich', pose: {} },
  { label: 'A — Kopf hängt', note: 'Körper gerade, Nicken 0,45', pose: { defeated: true, headNod: 0.45 } },
  { label: 'B — Kopf tief', note: 'gerade, Nicken 0,7, 2 tiefer', pose: { defeated: true, headNod: 0.7, headDrop: 2 } },
  { label: 'C — leicht vornüber', note: 'Körper 0,25, Nicken 0,35', pose: { defeated: true, tilt: 0.25, headNod: 0.35 } },
  { label: 'D — Bauchlandung', note: 'Körper 0,1, Nicken 0,5, 2 tiefer', pose: { defeated: true, tilt: 0.1, headNod: 0.5, headDrop: 2 } },
  { label: 'E — nur Ohren', note: 'gerade, Nicken 0,15', pose: { defeated: true, headNod: 0.15 } },
  { label: 'F — Nase runter', note: 'Nicken 0,9, 3 tiefer', pose: { defeated: true, headNod: 0.9, headDrop: 3 } },
  { label: 'G — bisher', note: 'Körper 0,95, kein Nicken', pose: { defeated: true, tilt: 0.95 } },
]

const CELL = 150
const SCALE = 3.2
const COLS = 4
const ROWS = Math.ceil(VARIANTS.length / COLS)

const canvas = document.getElementById('sheet') as HTMLCanvasElement
const dpr = Math.min(window.devicePixelRatio || 1, 2)
canvas.width = CELL * COLS * dpr
canvas.height = CELL * ROWS * dpr
canvas.style.width = `${CELL * COLS}px`
canvas.style.height = `${CELL * ROWS}px`
const ctx = canvas.getContext('2d')!
ctx.scale(dpr, dpr)

const dark = document.documentElement.dataset.theme === 'dark'
const palette = resolvePalette(dark)

document.fonts.ready.then(() => {
  ctx.fillStyle = palette.sky
  ctx.fillRect(0, 0, CELL * COLS, CELL * ROWS)
  VARIANTS.forEach((variant, i) => {
    const cx = (i % COLS) * CELL
    const cy = Math.floor(i / COLS) * CELL
    ctx.strokeStyle = 'rgba(0, 106, 255, 0.15)'
    ctx.lineWidth = 1
    ctx.strokeRect(cx + 0.5, cy + 0.5, CELL - 1, CELL - 1)
    // The ground line, so "level" has a reference.
    ctx.fillStyle = palette.ground
    ctx.fillRect(cx, cy + CELL - 22, CELL, 22)

    ctx.save()
    ctx.translate(cx + CELL / 2 - 4, cy + CELL / 2 - 4)
    ctx.scale(SCALE, SCALE)
    drawHippo(ctx, palette, { ...FLIGHT, ...variant.pose }, performance.now())
    ctx.restore()

    ctx.fillStyle = palette.text
    ctx.font = '600 13px Fredoka, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(variant.label, cx + 8, cy + 18)
    ctx.fillStyle = palette.brand
    ctx.font = '500 11px Nunito, sans-serif'
    ctx.fillText(variant.note, cx + 8, cy + 33)
  })
})
