// Turns the sources in src/assets/ into everything a store-quality PWA needs. Run after changing
// anything in src/assets/:  npm run assets
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
// The icon is a render of the hippo on flat blue (src/assets/icon.jpeg). The blue is keyed out
// by flood-filling from the borders, the hippo is set on the game's sky with a soft shadow, and
// that one picture serves every purpose: as it is for "maskable" (the face sits inside the
// launcher's safe zone) and for iOS, which rounds the corners itself; with iOS-style rounded
// corners cut out for "any", which browsers show as delivered. The monochrome icon is the
// hippo's silhouette, for Android's themed icons.

const ICON = 1024
/** The source's scale on the icon: the wings and feet nearly touch the edges. */
const HIPPO_SCALE = 0.66
const SHADOW = { dx: 0, dy: 26, blur: 14, alpha: 0.5 }

interface Cutout {
  png: Buffer
  width: number
  height: number
  /** Bounding box of the opaque pixels: left, top, right, bottom. */
  box: [number, number, number, number]
}

/** The hippo with the blue behind it turned transparent, edge pixels un-mixed from that blue. */
async function cutout(source: Buffer): Promise<Cutout> {
  const { data, info } = await sharp(source).raw().toBuffer({ resolveWithObject: true })
  const width = info.width
  const height = info.height
  const count = width * height
  // The background colour: the mean of a ring along the borders.
  const bg = [0, 0, 0]
  let ring = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x >= 4 && y >= 4 && x < width - 4 && y < height - 4) continue
      const i = (y * width + x) * 3
      bg[0] += data[i]
      bg[1] += data[i + 1]
      bg[2] += data[i + 2]
      ring++
    }
  }
  for (let c = 0; c < 3; c++) bg[c] /= ring
  const distance = new Float32Array(count)
  for (let p = 0; p < count; p++) {
    distance[p] = Math.hypot(data[p * 3] - bg[0], data[p * 3 + 1] - bg[1], data[p * 3 + 2] - bg[2])
  }
  // Flood from the borders through near-background pixels, so a dark blue inside the hippo (the
  // eyes) is never keyed.
  const NEAR = 45
  const isBackground = new Uint8Array(count)
  const stack: number[] = []
  for (let x = 0; x < width; x++) stack.push(x, (height - 1) * width + x)
  for (let y = 0; y < height; y++) stack.push(y * width, y * width + width - 1)
  while (stack.length > 0) {
    const p = stack.pop() as number
    if (isBackground[p] || distance[p] >= NEAR) continue
    isBackground[p] = 1
    const x = p % width
    const y = (p - x) / width
    if (x > 0) stack.push(p - 1)
    if (x < width - 1) stack.push(p + 1)
    if (y > 0) stack.push(p - width)
    if (y < height - 1) stack.push(p + width)
  }
  // Alpha: 0 on the background, a ramp on the pixels bordering it (the JPEG's soft edge), 1
  // inside. Semi-transparent pixels get the blue's share taken out of their colour.
  const RAMP = [18, 75]
  const out = Buffer.alloc(count * 4)
  const box: [number, number, number, number] = [width, height, 0, 0]
  for (let p = 0; p < count; p++) {
    const x = p % width
    const y = (p - x) / width
    let alpha = 1
    if (isBackground[p]) alpha = 0
    else {
      let edge = false
      for (let dy = -2; dy <= 2 && !edge; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const xx = x + dx
          const yy = y + dy
          if (xx >= 0 && yy >= 0 && xx < width && yy < height && isBackground[yy * width + xx]) {
            edge = true
            break
          }
        }
      }
      if (edge) alpha = Math.min(1, Math.max(0, (distance[p] - RAMP[0]) / (RAMP[1] - RAMP[0])))
    }
    for (let c = 0; c < 3; c++) {
      const v = data[p * 3 + c]
      out[p * 4 + c] =
        alpha > 0 && alpha < 1 ? Math.max(0, Math.min(255, Math.round((v - (1 - alpha) * bg[c]) / alpha))) : v
    }
    out[p * 4 + 3] = Math.round(alpha * 255)
    if (alpha > 0.03) {
      if (x < box[0]) box[0] = x
      if (y < box[1]) box[1] = y
      if (x > box[2]) box[2] = x
      if (y > box[3]) box[3] = y
    }
  }
  const png = await sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer()
  return { png, width, height, box }
}

/** The full-bleed icon: the hippo, centred by its bounding box, over the sky, with a shadow. */
async function composeIcon(hippo: Cutout): Promise<Buffer> {
  const size = Math.round(hippo.width * HIPPO_SCALE)
  const scaled = await sharp(hippo.png).resize(size, size, { kernel: 'lanczos3' }).png().toBuffer()
  const left = Math.round(ICON / 2 - ((hippo.box[0] + hippo.box[2]) / 2) * HIPPO_SCALE)
  const top = Math.round(ICON / 2 - ((hippo.box[1] + hippo.box[3]) / 2) * HIPPO_SCALE)
  const sky = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON}" height="${ICON}">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#4faaff"/><stop offset="0.5" stop-color="#1e90f5"/><stop offset="1" stop-color="#0b5fd2"/>
        </linearGradient>
        <radialGradient id="glow" cx="0.52" cy="0.46" r="0.5">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${ICON}" height="${ICON}" fill="url(#sky)"/>
      <rect width="${ICON}" height="${ICON}" fill="url(#glow)"/>
    </svg>`,
  )
  const alpha = await sharp(scaled).extractChannel('alpha').raw().toBuffer()
  const shade = Buffer.alloc(size * size * 4)
  for (let p = 0; p < size * size; p++) {
    shade[p * 4] = 6
    shade[p * 4 + 1] = 45
    shade[p * 4 + 2] = 120
    shade[p * 4 + 3] = Math.round(alpha[p] * SHADOW.alpha)
  }
  const shadow = await sharp(shade, { raw: { width: size, height: size, channels: 4 } })
    .blur(SHADOW.blur)
    .png()
    .toBuffer()
  return sharp(sky)
    .composite([
      { input: shadow, left: left + SHADOW.dx, top: top + SHADOW.dy },
      { input: scaled, left, top },
    ])
    .png()
    .toBuffer()
}

/** The hippo's silhouette in white, inside the safe zone: Android tints it for themed icons. */
async function monochrome(hippo: Cutout, size: number): Promise<Buffer> {
  const [l, t, r, b] = hippo.box
  const fit = size * 0.66
  const scale = Math.min(fit / (r - l + 1), fit / (b - t + 1))
  const w = Math.round(hippo.width * scale)
  const alpha = await sharp(hippo.png).resize(w, w).extractChannel('alpha').raw().toBuffer()
  const white = Buffer.alloc(w * w * 4, 255)
  for (let p = 0; p < w * w; p++) white[p * 4 + 3] = alpha[p]
  const silhouette = await sharp(white, { raw: { width: w, height: w, channels: 4 } }).png().toBuffer()
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: silhouette, left: Math.round(size / 2 - ((l + r) / 2) * scale), top: Math.round(size / 2 - ((t + b) / 2) * scale) }])
    .png({ compressionLevel: 9 })
    .toBuffer()
}

const hippo = await cutout(await asset('icon.jpeg'))
const icon = await composeIcon(hippo)

async function bleed(size: number): Promise<Buffer> {
  return sharp(icon).resize(size, size, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer()
}

async function tile(size: number): Promise<Buffer> {
  const radius = Math.round(size * 0.2237)
  const corners = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}"/></svg>`,
  )
  return sharp(await bleed(size))
    .composite([{ input: corners, blend: 'dest-in' }])
    .png({ compressionLevel: 9 })
    .toBuffer()
}

await out('icon-192.png', await tile(192))
await out('icon-512.png', await tile(512))
await out('icon-maskable-192.png', await bleed(192))
await out('icon-maskable-512.png', await bleed(512))
await out('icon-mono-512.png', await monochrome(hippo, 512))
await out('apple-touch-icon.png', await bleed(180))
// Browsers without SVG favicon support (Safari) fall back to this.
await out('favicon-32.png', await raster(await readFile(join(root, 'public', 'favicon.svg')), 32))

// The link preview (Open Graph, Twitter card): the poster, at a size every network accepts and
// a weight a chat client fetches without blinking. Its 3:2 keeps the title and the cat; feeds
// that want 1.91:1 crop a little sky and wall.
const preview = await sharp(await asset('poster.jpeg')).resize(1200, 800).jpeg({ quality: 82, mozjpeg: true }).toBuffer()
await writeFile(join(root, 'public', 'preview.jpg'), preview)
console.log(`public/preview.jpg (${Math.round(preview.length / 1024)} KB)`)
await writeFile(join(root, 'public', 'mask-icon.svg'), await asset('mask-icon.svg'))
