import { SCENE_PERIOD } from '../constants.ts'
import type { Palette } from '../types.ts'

/**
 * Baked parallax strips. A side-scroller's background is the same picture every frame, only
 * shifted, so painting its hundreds of shapes anew sixty times a second is wasted work. Each
 * strip is rasterised once, one scene period wide at device resolution, and then blitted at the
 * scroll offset — two or three `drawImage` calls a frame in place of every path in the layer.
 * The bake is thrown away when the resolution, the palette or the field height changes.
 */
export interface Layer {
  canvas: HTMLCanvasElement
  /** World units the strip reaches above the ground line. */
  above: number
  /** World units it reaches below it. */
  below: number
  /** How wide the strip is before it repeats. */
  period: number
}

export type Painter = (ctx: CanvasRenderingContext2D, ground: number) => void

export class LayerCache {
  private scale = 0
  private palette: Palette | null = null
  private groundY = 0
  private layers = new Map<string, Layer>()
  private skyGradient: CanvasGradient | null = null
  private skyHeight = 0

  /** Call once per frame; a change in resolution, palette or field drops every bake. */
  prepare(scale: number, palette: Palette, groundY: number): void {
    if (scale === this.scale && palette === this.palette && groundY === this.groundY) return
    this.scale = scale
    this.palette = palette
    this.groundY = groundY
    this.layers.clear()
    this.skyGradient = null
  }

  /**
   * The strip for `name`, painted on first use. `paint` draws in world units with the ground
   * line at `ground`. A strip may repeat on a longer period than the scene's, for things that
   * should not come round every few screens.
   */
  layer(name: string, above: number, below: number, paint: Painter, period = SCENE_PERIOD): Layer {
    const cached = this.layers.get(name)
    if (cached) return cached
    const canvas = document.createElement('canvas')
    const height = above + below
    canvas.width = Math.ceil(period * this.scale)
    canvas.height = Math.ceil(height * this.scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D is not available')
    ctx.scale(this.scale, this.scale)
    paint(ctx, above)
    const layer = { canvas, above, below, period }
    this.layers.set(name, layer)
    return layer
  }

  /**
   * Paints a strip across the field at the scroll offset, tiling as often as the width needs.
   * Returns where the first copy was placed, for anything drawn live that must line up with it.
   */
  blit(ctx: CanvasRenderingContext2D, layer: Layer, shift: number, width: number): number {
    const height = layer.above + layer.below
    const y = this.groundY - layer.above
    // Snapped to device pixels, so the bake is never resampled and stays crisp while scrolling.
    const origin = Math.round(-shift * this.scale) / this.scale
    for (let x = origin; x < width; x += layer.period) ctx.drawImage(layer.canvas, x, y, layer.period, height)
    return origin
  }

  /** The sky's gradient, made once per palette and field height. */
  sky(ctx: CanvasRenderingContext2D, palette: Palette, height: number): CanvasGradient {
    if (this.skyGradient && this.skyHeight === height) return this.skyGradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, palette.sky)
    gradient.addColorStop(1, palette.skyLow)
    this.skyGradient = gradient
    this.skyHeight = height
    return gradient
  }
}
