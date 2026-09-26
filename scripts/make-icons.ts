// Rasterizes the app mark in assets/ into the PNGs the web manifest and iOS ask for. Run after
// changing either SVG:  npm run icons
//
// The output lands in public/ and is committed, so a plain `npm ci && npm run build` never needs
// an image toolchain.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

interface Target {
  source: 'icon.svg' | 'icon-maskable.svg'
  out: string
  size: number
}

const TARGETS: Target[] = [
  { source: 'icon.svg', out: 'icon-192.png', size: 192 },
  { source: 'icon.svg', out: 'icon-512.png', size: 512 },
  { source: 'icon-maskable.svg', out: 'icon-maskable-512.png', size: 512 },
  // iOS ignores transparency and rounds the corners itself, so it gets the full-bleed mark.
  { source: 'icon-maskable.svg', out: 'apple-touch-icon.png', size: 180 },
]

for (const target of TARGETS) {
  const svg = await readFile(join(root, 'assets', target.source))
  const png = await sharp(svg, { density: 512 })
    .resize(target.size, target.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer()
  const out = join(root, 'public', target.out)
  await mkdir(dirname(out), { recursive: true })
  await writeFile(out, png)
  console.log(`${target.out}  ${target.size}x${target.size}  ${(png.length / 1024).toFixed(1)} kB`)
}
