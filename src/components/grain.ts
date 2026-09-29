/**
 * Specks of black and white at low opacity. A blend mode would be the obvious choice, but overlay
 * and soft light both fade out against a sky this pale; plain specks carry over any ground.
 */

export const GRAIN = { tile: 180, strength: 11 }

let tile: HTMLCanvasElement | null = null
let url: string | null = null

export function grainTile(): HTMLCanvasElement {
  if (tile) return tile
  const canvas = document.createElement('canvas')
  canvas.width = GRAIN.tile
  canvas.height = GRAIN.tile
  tile = canvas
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const noise = ctx.createImageData(canvas.width, canvas.height)
  for (let i = 0; i < noise.data.length; i += 4) {
    const value = Math.random() < 0.5 ? 0 : 255
    noise.data[i] = value
    noise.data[i + 1] = value
    noise.data[i + 2] = value
    noise.data[i + 3] = Math.random() * GRAIN.strength
  }
  ctx.putImageData(noise, 0, 0)
  return canvas
}

/** The same specks as a CSS background, for the parts of the page that are not the canvas. */
export function grainUrl(): string {
  url ??= grainTile().toDataURL()
  return url
}
