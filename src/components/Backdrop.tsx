import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { SHORT_SIDE } from '../game/constants.ts'
import { resolvePalette } from '../game/palette.ts'
import { LayerCache } from '../game/render/layers.ts'
import { drawStrip, stampCloud } from '../game/render/scenery.ts'

interface BackdropProps {
  box: RefObject<HTMLElement | null>
  canvas: RefObject<HTMLCanvasElement | null>
  dark: boolean
}

const BLUR = 2.2
const SETTLE_MS = 120
const GRAIN = { tile: 180, strength: 16 }
const HAZE = 0.3
const TINT = { light: '#cfe4ff', dark: '#6b7ba6' }
/** Props are lit for daylight; at night they sink into the sky instead of glowing on it. */
const NIGHT_PROPS = 0.5

const NAMES = [
  'pipe-hanging',
  'pipe-standing',
  'construction',
  'cat',
  'pot',
  'bush-wide',
  'bush-mid',
  'grass',
  'daisies',
] as const

type PropName = (typeof NAMES)[number]
type Props = Map<PropName, HTMLImageElement>

interface Placement {
  name: PropName
  /** Across the page, 0 at the left edge and 1 at the right. */
  at: number
  /** Tall, as a share of the room under the board. */
  height: number
}

/** Standing on the page's bottom edge, back to front, and clear of the middle where the shortcuts sit. */
const GROUND: Placement[] = [
  { name: 'pipe-standing', at: 0.035, height: 0.72 },
  { name: 'bush-wide', at: 0.19, height: 0.32 },
  { name: 'construction', at: 0.08, height: 0.58 },
  { name: 'grass', at: 0.27, height: 0.2 },
  { name: 'bush-mid', at: 0.83, height: 0.3 },
  { name: 'pot', at: 0.74, height: 0.3 },
  { name: 'cat', at: 0.93, height: 0.44 },
  { name: 'daisies', at: 0.69, height: 0.18 },
]

const HANGING = [
  { at: 0.15, width: 80 },
  { at: 0.85, width: 64 },
]

const SKY = [
  { at: 0.05, y: 0.05, scale: 1.5, cloud: 0 },
  { at: 0.23, y: 0.14, scale: 1, cloud: 3 },
  { at: 0.38, y: 0.04, scale: 1.2, cloud: 1 },
  { at: 0.56, y: 0.12, scale: 0.9, cloud: 4 },
  { at: 0.71, y: 0.04, scale: 1.35, cloud: 2 },
  { at: 0.92, y: 0.13, scale: 1.1, cloud: 5 },
  { at: 0.03, y: 0.42, scale: 0.8, cloud: 6 },
  { at: 0.96, y: 0.48, scale: 0.85, cloud: 1 },
]

/**
 * Specks of black and white at low opacity. A blend mode would be the obvious choice, but overlay
 * and soft light both fade out against a sky this pale; plain specks carry over any ground.
 */
function grainTile(): HTMLCanvasElement {
  const tile = document.createElement('canvas')
  tile.width = GRAIN.tile
  tile.height = GRAIN.tile
  const ctx = tile.getContext('2d')
  if (!ctx) return tile
  const noise = ctx.createImageData(tile.width, tile.height)
  for (let i = 0; i < noise.data.length; i += 4) {
    const value = Math.random() < 0.5 ? 0 : 255
    noise.data[i] = value
    noise.data[i + 1] = value
    noise.data[i + 2] = value
    noise.data[i + 3] = Math.random() * GRAIN.strength
  }
  ctx.putImageData(noise, 0, 0)
  return tile
}

let pending: Promise<Props> | null = null

function loadProps(): Promise<Props> {
  pending ??= Promise.all(
    NAMES.map(async (name) => {
      const image = new Image()
      image.src = `props/${name}.webp`
      try {
        await image.decode()
        return [name, image] as const
      } catch {
        return null
      }
    }),
  ).then((entries) => new Map(entries.filter((entry) => entry !== null)))
  return pending
}

/** The page around a framed board: its own sky, and a foreground of grass and painted props. */
export function Backdrop({ box, canvas, dark }: BackdropProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const far = useRef(new LayerCache())
  const grain = useRef<HTMLCanvasElement>(null as unknown as HTMLCanvasElement)
  grain.current ??= grainTile()
  const [props, setProps] = useState<Props | null>(null)

  useEffect(() => {
    let alive = true
    void loadProps().then((loaded) => {
      if (alive) setProps(loaded)
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const target = ref.current
    const boxEl = box.current
    const board = canvas.current
    if (!target || !boxEl || !board) return
    const paint = () => {
      const bounds = boxEl.getBoundingClientRect()
      const rect = board.getBoundingClientRect()
      const framed = bounds.width - rect.width > 2 || bounds.height - rect.height > 2
      target.hidden = !framed
      if (!framed) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      target.width = Math.round(bounds.width * dpr)
      target.height = Math.round(bounds.height * dpr)
      target.style.width = `${bounds.width}px`
      target.style.height = `${bounds.height}px`
      const ctx = target.getContext('2d')
      if (!ctx) return
      const palette = resolvePalette(dark)
      const pixel = (Math.min(rect.width, rect.height) / SHORT_SIDE) * dpr
      const room = Math.max(bounds.height - rect.height, 0) * 0.5 * dpr
      const ground = target.height
      far.current.prepare(pixel, palette, 0)

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, target.width, target.height)
      const sky = ctx.createLinearGradient(0, 0, 0, ground)
      sky.addColorStop(0, palette.sky)
      sky.addColorStop(1, palette.skyLow)
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, target.width, ground)

      ctx.setTransform(pixel, 0, 0, pixel, 0, 0)
      for (const { at, y, scale, cloud } of SKY) {
        stampCloud(ctx, palette, far.current, cloud, (target.width * at) / pixel, (target.height * y) / pixel, scale)
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, target.width, ground)
      ctx.clip()
      ctx.filter = `blur(${BLUR * dpr}px)`
      ctx.setTransform(pixel, 0, 0, pixel, 0, ground)
      drawStrip(ctx, palette, far.current, 'far', target.width / pixel)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.filter = 'none'
      ctx.globalAlpha = HAZE
      ctx.fillStyle = palette.sky
      ctx.fillRect(0, 0, target.width, ground)
      ctx.globalAlpha = 1
      ctx.restore()

      ctx.globalAlpha = dark ? NIGHT_PROPS : 1
      for (const { name, at, height } of GROUND) {
        const image = props?.get(name)
        if (!image) continue
        const tall = height * room
        const wide = tall * (image.naturalWidth / image.naturalHeight)
        const x = target.width * at
        const foot = ground + tall * 0.05
        ctx.drawImage(image, x - wide / 2, foot - tall, wide, tall)
      }

      const pipe = props?.get('pipe-hanging')
      if (pipe) {
        for (const { at, width: units } of HANGING) {
          const wide = units * pixel
          const tall = wide * (pipe.naturalHeight / pipe.naturalWidth)
          ctx.drawImage(pipe, target.width * at - wide / 2, 0, wide, tall)
        }
      }
      ctx.globalAlpha = 1

      ctx.globalCompositeOperation = 'multiply'
      ctx.fillStyle = dark ? TINT.dark : TINT.light
      ctx.fillRect(0, 0, target.width, target.height)

      ctx.globalCompositeOperation = 'source-over'
      const pattern = ctx.createPattern(grain.current, 'repeat')
      if (pattern) {
        // One speck to a CSS pixel, so it reads the same on a plain and a retina display.
        pattern.setTransform(new DOMMatrix([dpr, 0, 0, dpr, 0, 0]))
        ctx.fillStyle = pattern
        ctx.fillRect(0, 0, target.width, target.height)
      }
    }
    // A drag across the desktop resizes many times a second, and each paint rebakes the strips.
    let settle = 0
    const observer = new ResizeObserver(() => {
      clearTimeout(settle)
      settle = window.setTimeout(paint, SETTLE_MS)
    })
    observer.observe(boxEl)
    observer.observe(board)
    paint()
    return () => {
      clearTimeout(settle)
      observer.disconnect()
    }
  }, [box, canvas, dark, props])

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0" />
}
