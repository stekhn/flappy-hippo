// Rasterizes the marks in src/assets/ into everything a store-quality PWA needs, and writes the iOS
// splash-screen <link> tags into index.html between the splash markers. Run after changing any
// SVG in src/assets/:  npm run assets
//
// The output lands in public/ and is committed, so a plain `npm ci && npm run build` never needs
// an image toolchain. Screenshots for the manifest come from scripts/make-screenshots.ts.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const asset = (name: string) => readFile(join(root, 'src', 'assets', name))
const out = async (name: string, png: Buffer) => {
  const path = join(root, 'public', name)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, png)
  console.log(`${name.padEnd(44)} ${(png.length / 1024).toFixed(1).padStart(6)} kB`)
}

async function raster(svg: Buffer, size: number): Promise<Buffer> {
  return sharp(svg, { density: 600 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

// ---- icons -----------------------------------------------------------------------------------
const icon = await asset('icon.svg')
const maskable = await asset('icon-maskable.svg')
const mono = await asset('icon-mono.svg')

await out('icon-192.png', await raster(icon, 192))
await out('icon-512.png', await raster(icon, 512))
await out('icon-maskable-192.png', await raster(maskable, 192))
await out('icon-maskable-512.png', await raster(maskable, 512))
await out('icon-mono-512.png', await raster(mono, 512))
// iOS ignores transparency and rounds the corners itself, so it gets the full-bleed mark.
await out('apple-touch-icon.png', await raster(maskable, 180))
// Browsers without SVG favicon support (Safari) fall back to this.
await out('favicon-32.png', await raster(await readFile(join(root, 'public', 'favicon.svg')), 32))

// The link preview (Open Graph, Twitter card): the poster, at a size every network accepts and
// a weight a chat client fetches without blinking. Its 3:2 keeps the title and the cat; feeds
// that want 1.91:1 crop a little sky and wall.
const preview = await sharp(await asset('poster.jpeg')).resize(1200, 800).jpeg({ quality: 82, mozjpeg: true }).toBuffer()
await writeFile(join(root, 'public', 'preview.jpg'), preview)
console.log(`public/preview.jpg (${Math.round(preview.length / 1024)} KB)`)
await writeFile(join(root, 'public', 'mask-icon.svg'), await asset('mask-icon.svg'))

// ---- iOS splash screens ----------------------------------------------------------------------
// Safari shows a white screen while an installed web app launches unless a startup image exists
// for the exact device — so one image per device class, orientation and colour scheme. Logical
// points and pixel ratio, portrait first; the file is the icon on the sky.

interface Device {
  name: string
  width: number
  height: number
  ratio: number
}

const DEVICES: Device[] = [
  { name: 'iPhone 16 Pro Max', width: 440, height: 956, ratio: 3 },
  { name: 'iPhone 16 Pro', width: 402, height: 874, ratio: 3 },
  { name: 'iPhone 16 Plus / 15 Pro Max', width: 430, height: 932, ratio: 3 },
  { name: 'iPhone 16 / 15 Pro / 15', width: 393, height: 852, ratio: 3 },
  { name: 'iPhone 14 Plus / 13 Pro Max', width: 428, height: 926, ratio: 3 },
  { name: 'iPhone 14 / 13 / 12', width: 390, height: 844, ratio: 3 },
  { name: 'iPhone 13 mini / 12 mini / X', width: 375, height: 812, ratio: 3 },
  { name: 'iPhone 11 Pro Max / XS Max', width: 414, height: 896, ratio: 3 },
  { name: 'iPhone 11 / XR', width: 414, height: 896, ratio: 2 },
  { name: 'iPhone SE / 8', width: 375, height: 667, ratio: 2 },
  { name: 'iPad Pro 12.9', width: 1024, height: 1366, ratio: 2 },
  { name: 'iPad Pro 11', width: 834, height: 1194, ratio: 2 },
  { name: 'iPad Air / 10.9', width: 820, height: 1180, ratio: 2 },
  { name: 'iPad 10.2', width: 810, height: 1080, ratio: 2 },
  { name: 'iPad mini', width: 744, height: 1133, ratio: 2 },
]

const SKY = { light: '#e5f0ff', dark: '#111a26' } as const

async function splash(width: number, height: number, scheme: keyof typeof SKY): Promise<Buffer> {
  const mark = Math.round(Math.min(width, height) * 0.22)
  const tile = await raster(icon, mark)
  return sharp({ create: { width, height, channels: 4, background: SKY[scheme] } })
    .composite([{ input: tile, left: Math.round((width - mark) / 2), top: Math.round((height - mark) / 2) }])
    .png({ compressionLevel: 9, palette: true })
    .toBuffer()
}

const links: string[] = []
for (const device of DEVICES) {
  for (const scheme of ['light', 'dark'] as const) {
    for (const orientation of ['portrait', 'landscape'] as const) {
      const w = (orientation === 'portrait' ? device.width : device.height) * device.ratio
      const h = (orientation === 'portrait' ? device.height : device.width) * device.ratio
      const file = `splash/${w}x${h}-${scheme}.png`
      await out(file, await splash(w, h, scheme))
      const media = [
        'screen',
        `(device-width: ${device.width}px)`,
        `(device-height: ${device.height}px)`,
        `(-webkit-device-pixel-ratio: ${device.ratio})`,
        `(orientation: ${orientation})`,
        scheme === 'dark' ? '(prefers-color-scheme: dark)' : null,
      ]
        .filter(Boolean)
        .join(' and ')
      links.push(`    <link rel="apple-touch-startup-image" media="${media}" href="${file}" />`)
    }
  }
}

const html = join(root, 'index.html')
const source = await readFile(html, 'utf8')
const start = '    <!-- splash:start — generated by scripts/make-assets.ts, do not edit by hand -->'
const end = '    <!-- splash:end -->'
const a = source.indexOf(start)
const b = source.indexOf(end)
if (a < 0 || b < 0) throw new Error('index.html is missing the splash markers')
await writeFile(html, source.slice(0, a + start.length) + '\n' + links.join('\n') + '\n' + source.slice(b))
console.log(`\n${links.length} splash links written to index.html`)
