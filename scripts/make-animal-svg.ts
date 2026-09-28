// Turns the street's animals into SVG files by recording what their canvas drawing routines do.
//
//   node --experimental-strip-types scripts/make-animal-svg.ts dog dog.svg
//   node --experimental-strip-types scripts/make-animal-svg.ts cat cat.svg [--age 1.4]
//
// A small stand-in for CanvasRenderingContext2D collects paths, fills and strokes under the current
// transform and writes them out as <path> elements, so the file is the very drawing the game paints.

import { writeFileSync } from 'node:fs'
import { resolvePalette } from '../src/game/palette.ts'

type Matrix = [number, number, number, number, number, number]

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]

function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ]
}

const num = (v: number): string => String(Math.round(v * 100) / 100)
const deg = (rad: number): number => (rad * 180) / Math.PI

/** Path data in the drawing's own units; the transform in force is applied when it is painted. */
class RecordedPath {
  d = ''
  private cursor: [number, number] | null = null

  moveTo(x: number, y: number): void {
    this.d += `M${num(x)} ${num(y)}`
    this.cursor = [x, y]
  }

  lineTo(x: number, y: number): void {
    this.d += `L${num(x)} ${num(y)}`
    this.cursor = [x, y]
  }

  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void {
    this.d += `Q${num(cx)} ${num(cy)} ${num(x)} ${num(y)}`
    this.cursor = [x, y]
  }

  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void {
    this.d += `C${num(c1x)} ${num(c1y)} ${num(c2x)} ${num(c2y)} ${num(x)} ${num(y)}`
    this.cursor = [x, y]
  }

  closePath(): void {
    this.d += 'Z'
  }

  rect(x: number, y: number, w: number, h: number): void {
    this.d += `M${num(x)} ${num(y)}h${num(w)}v${num(h)}h${num(-w)}Z`
    this.cursor = [x, y]
  }

  roundRect(x: number, y: number, w: number, h: number, radii: number | number[] = 0): void {
    const r =
      typeof radii === 'number'
        ? [radii, radii, radii, radii]
        : radii.length === 4
          ? radii
          : [radii[0], radii[0], radii[0], radii[0]]
    const [tl, tr, br, bl] = r.map((v) => Math.min(v, w / 2, h / 2))
    this.d +=
      `M${num(x + tl)} ${num(y)}` +
      `H${num(x + w - tr)}A${num(tr)} ${num(tr)} 0 0 1 ${num(x + w)} ${num(y + tr)}` +
      `V${num(y + h - br)}A${num(br)} ${num(br)} 0 0 1 ${num(x + w - br)} ${num(y + h)}` +
      `H${num(x + bl)}A${num(bl)} ${num(bl)} 0 0 1 ${num(x)} ${num(y + h - bl)}` +
      `V${num(y + tl)}A${num(tl)} ${num(tl)} 0 0 1 ${num(x + tl)} ${num(y)}Z`
    this.cursor = [x + tl, y]
  }

  arc(cx: number, cy: number, r: number, a0: number, a1: number, ccw = false): void {
    this.ellipse(cx, cy, r, r, 0, a0, a1, ccw)
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, rotation: number, a0: number, a1: number, ccw = false): void {
    const point = (a: number): [number, number] => {
      const px = rx * Math.cos(a)
      const py = ry * Math.sin(a)
      return [
        cx + px * Math.cos(rotation) - py * Math.sin(rotation),
        cy + px * Math.sin(rotation) + py * Math.cos(rotation),
      ]
    }
    let sweep = ccw ? a0 - a1 : a1 - a0
    const full = sweep >= Math.PI * 2 - 1e-9
    if (full) sweep = Math.PI * 2
    const [sx, sy] = point(a0)
    // A line from the current point, as the canvas does; a fresh subpath otherwise.
    this.d += this.cursor ? `L${num(sx)} ${num(sy)}` : `M${num(sx)} ${num(sy)}`
    const flag = ccw ? 0 : 1
    if (full) {
      // Four quarter arcs: a single arc cannot describe a whole circle, and two halves leave the
      // renderer to pick the side of an exact half-turn, which it sometimes gets wrong.
      for (let q = 1; q <= 4; q++) {
        const [qx, qy] = point(a0 + (ccw ? -q : q) * (Math.PI / 2))
        this.d += `A${num(rx)} ${num(ry)} ${num(deg(rotation))} 0 ${flag} ${num(qx)} ${num(qy)}`
      }
      this.cursor = [sx, sy]
      return
    }
    const [ex, ey] = point(ccw ? a0 - sweep : a0 + sweep)
    this.d += `A${num(rx)} ${num(ry)} ${num(deg(rotation))} ${sweep > Math.PI ? 1 : 0} ${flag} ${num(ex)} ${num(ey)}`
    this.cursor = [ex, ey]
  }
}

interface State {
  matrix: Matrix
  fillStyle: string
  strokeStyle: string
  lineWidth: number
  lineCap: string
  lineJoin: string
  globalAlpha: number
}

/** Enough of a 2D context for the animals: paths, fills, strokes, transforms, styles. */
class SvgContext {
  // The street sets round caps and joins before drawing an animal; the recorder starts there.
  private state: State = {
    matrix: IDENTITY,
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    lineCap: 'round',
    lineJoin: 'round',
    globalAlpha: 1,
  }
  private stack: State[] = []
  private path = new RecordedPath()
  readonly elements: string[] = []

  get fillStyle(): string {
    return this.state.fillStyle
  }
  set fillStyle(v: string) {
    this.state.fillStyle = v
  }
  get strokeStyle(): string {
    return this.state.strokeStyle
  }
  set strokeStyle(v: string) {
    this.state.strokeStyle = v
  }
  get lineWidth(): number {
    return this.state.lineWidth
  }
  set lineWidth(v: number) {
    this.state.lineWidth = v
  }
  get lineCap(): string {
    return this.state.lineCap
  }
  set lineCap(v: string) {
    this.state.lineCap = v
  }
  get lineJoin(): string {
    return this.state.lineJoin
  }
  set lineJoin(v: string) {
    this.state.lineJoin = v
  }
  get globalAlpha(): number {
    return this.state.globalAlpha
  }
  set globalAlpha(v: number) {
    this.state.globalAlpha = v
  }

  save(): void {
    this.stack.push({ ...this.state })
  }
  restore(): void {
    const s = this.stack.pop()
    if (s) this.state = s
  }
  translate(x: number, y: number): void {
    this.state.matrix = multiply(this.state.matrix, [1, 0, 0, 1, x, y])
  }
  rotate(a: number): void {
    this.state.matrix = multiply(this.state.matrix, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0])
  }
  scale(x: number, y: number): void {
    this.state.matrix = multiply(this.state.matrix, [x, 0, 0, y, 0, 0])
  }

  beginPath(): void {
    this.path = new RecordedPath()
  }
  moveTo(x: number, y: number): void {
    this.path.moveTo(x, y)
  }
  lineTo(x: number, y: number): void {
    this.path.lineTo(x, y)
  }
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void {
    this.path.quadraticCurveTo(cx, cy, x, y)
  }
  bezierCurveTo(a: number, b: number, c: number, d: number, x: number, y: number): void {
    this.path.bezierCurveTo(a, b, c, d, x, y)
  }
  closePath(): void {
    this.path.closePath()
  }
  rect(x: number, y: number, w: number, h: number): void {
    this.path.rect(x, y, w, h)
  }
  roundRect(x: number, y: number, w: number, h: number, r?: number | number[]): void {
    this.path.roundRect(x, y, w, h, r)
  }
  arc(cx: number, cy: number, r: number, a0: number, a1: number, ccw?: boolean): void {
    this.path.arc(cx, cy, r, a0, a1, ccw)
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, rot: number, a0: number, a1: number, ccw?: boolean): void {
    this.path.ellipse(cx, cy, rx, ry, rot, a0, a1, ccw)
  }

  fill(path?: RecordedPath): void {
    this.emit(path ?? this.path, `fill="${this.state.fillStyle}"`)
  }

  stroke(path?: RecordedPath): void {
    const s = this.state
    this.emit(
      path ?? this.path,
      `fill="none" stroke="${s.strokeStyle}" stroke-width="${num(s.lineWidth)}" stroke-linecap="${s.lineCap}" stroke-linejoin="${s.lineJoin}"`,
    )
  }

  fillRect(x: number, y: number, w: number, h: number): void {
    const p = new RecordedPath()
    p.rect(x, y, w, h)
    this.fill(p)
  }

  private emit(path: RecordedPath, paint: string): void {
    if (!path.d) return
    const m = this.state.matrix
    const transform = m.every((v, i) => v === IDENTITY[i]) ? '' : ` transform="matrix(${m.map(num).join(' ')})"`
    const alpha = this.state.globalAlpha < 1 ? ` opacity="${num(this.state.globalAlpha)}"` : ''
    this.elements.push(`  <path d="${path.d}" ${paint}${transform}${alpha}/>`)
  }
}

// The animals build their tails as Path2D objects: the recorder's path stands in for it.
;(globalThis as { Path2D?: unknown }).Path2D = RecordedPath

const [kind, out, ...rest] = process.argv.slice(2)
const age = rest[0] === '--age' ? Number(rest[1]) : 0.2
if ((kind !== 'dog' && kind !== 'cat') || !out) {
  console.error('usage: make-animal-svg.ts dog|cat <file.svg> [--age seconds]')
  process.exit(1)
}

const { drawCat, drawDog } = await import('../src/game/render/street.ts')
const palette = resolvePalette(false)
const ctx = new SvgContext()
;(kind === 'dog' ? drawDog : drawCat)(ctx as unknown as CanvasRenderingContext2D, palette, 0, 0, age, 0)

// The bounds, generous: the animals stand on y = 0 and face right from x = 0.
const box = kind === 'dog' ? '-14 -30 30 32' : '-14 -22 26 24'
const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" width="${box.split(' ')[2]}" height="${box.split(' ')[3]}">`,
  `  <!-- ${kind}, as drawn by src/game/render/street.ts; one unit is one world unit -->`,
  ...ctx.elements,
  '</svg>',
  '',
].join('\n')
writeFileSync(out, svg)
console.log(`${out}: ${ctx.elements.length} paths`)
