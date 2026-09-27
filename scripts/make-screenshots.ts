// Captures the manifest screenshots (and the social image) from the running app, so what the
// install dialog shows is the real game. Needs a Chrome or Chromium on this machine:
//
//   CHROME_PATH=/path/to/chrome npm run screenshots
//
// or one of the usual locations (Google Chrome, Chromium, a Playwright headless shell). The script
// starts the dev server itself, stages each scene through the dev-only window.__flappyHippo hook,
// and writes PNGs to public/screenshots/. Commit the result; the build never runs this.

import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'
import type { Page } from 'puppeteer-core'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 4321
const URL = `http://localhost:${PORT}/`

function findChrome(): string {
  const playwright = join(homedir(), 'Library', 'Caches', 'ms-playwright')
  const shells = existsSync(playwright)
    ? readdirSync(playwright)
        .filter((d) => d.startsWith('chromium_headless_shell-'))
        .sort()
        .reverse()
        .flatMap((d) => {
          const dir = join(playwright, d)
          return readdirSync(dir)
            .filter((s) => s.startsWith('chrome-headless-shell-'))
            .map((s) => join(dir, s, 'chrome-headless-shell'))
        })
    : []
  const candidates = [
    process.env.CHROME_PATH,
    ...shells,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter((c): c is string => Boolean(c))
  const found = candidates.find((c) => existsSync(c))
  if (!found) throw new Error('No Chrome found. Set CHROME_PATH to a Chrome or Chromium binary.')
  return found
}

async function waitForServer(): Promise<void> {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(URL)).ok) return
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error('dev server did not come up')
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** A seasoned player's save, so the screens have something to show. */
const PROGRESS = {
  version: 1,
  best: { easy: 12, normal: 29, hard: 0 },
  stats: { games: 12, points: 214, pipes: 190, melons: 8, shields: 2, saves: 1, nightGames: 3, seconds: 640 },
  scores: [
    { score: 29, difficulty: 'normal', melons: 2, at: 1758900000000 },
    { score: 21, difficulty: 'normal', melons: 1, at: 1758800000000 },
    { score: 12, difficulty: 'easy', melons: 0, at: 1758700000000 },
  ],
  achievements: { 'first-flight': 1, ten: 1, quarter: 1, 'night-owl': 1 },
}

interface Scene {
  file: string
  form: 'narrow' | 'wide'
  dark: boolean
  stage: (page: Page) => Promise<void>
}

const VIEWPORTS = {
  narrow: { width: 540, height: 960 },
  wide: { width: 960, height: 540 },
}

/**
 * A round deep in the game: a big score, a shield with a spare, a melon to detour for, a pipe
 * under repair swinging ahead, a pot on its balcony and one already falling, and the last
 * milestone's confetti still in the air.
 */
async function flight(page: Page): Promise<void> {
  await page.evaluate(() => {
    const runtime = (window as Window & { __flappyHippo?: { flap(): void; inspect(): { state: any; world: any } } }).__flappyHippo!
    runtime.flap()
    const { state, world } = runtime.inspect()
    state.score = 213
    state.pipesCleared = 198
    state.melons = 5
    state.charges = 2
    state.shieldAt = 0
    state.potsDodged = 9
    state.moversPassed = 14
    state.hippoY = world.groundY * 0.5
    state.velocity = -150
    const gap = state.hippoY
    // The first pipe sits clear of the score at the top centre on a wide field, allowing for the
    // few frames it scrolls before the capture.
    const ahead = Math.max(world.hippoX + 150, world.width * 0.62)
    state.pipes = [
      { x: ahead, gapY: gap + 8, half: 55, passed: false, baseY: gap + 8, swing: 34, phase: 0.6 },
      { x: ahead + 220, gapY: gap - 55, half: 55, passed: false, baseY: gap - 55, swing: 0, phase: 0 },
      { x: ahead + 440, gapY: gap + 25, half: 55, passed: false, baseY: gap + 25, swing: 0, phase: 0 },
    ]
    // The melon hangs between the hippo and the first pipe, in view on every field.
    state.pickups = [
      { kind: 'melon', x: world.hippoX + 78, y: gap - 62, taken: false, seed: 1 },
      { kind: 'shield', x: ahead + 248, y: gap - 55, taken: false, seed: 2 },
    ]
    state.pots = [
      { x: world.hippoX + 40, y: gap - 110, vy: 220, lead: 0.7, falling: true, spin: 0.7, passed: false, smashed: false, seed: 1 },
      { x: Math.min(ahead + 120, world.width - 32), y: 13.4, vy: 0, lead: 0.8, falling: false, spin: 0.08, passed: false, smashed: false, seed: 2 },
    ]
    for (let i = 0; i < 44; i++) {
      state.confetti.push({
        x: 20 + ((i * 37) % (world.width - 40)),
        y: 40 + ((i * 53) % (world.groundY * 0.55)),
        vx: 0, vy: 30, angle: i, spin: 3, flip: i * 0.7, flipRate: 8,
        w: 6, h: 3.5, round: i % 4 === 0, tint: i % 3, life: 1.5, seed: i,
      })
    }
    state.nextSpawn = state.scrolled + ahead + 660
  })
  await sleep(80)
}

// One in-game scene per form factor, which is what the install dialogs ask for: the phone's at
// night, the desktop's by day, so the pair shows both themes.
const SCENES: Scene[] = [
  { file: 'narrow-flight', form: 'narrow', dark: true, stage: flight },
  { file: 'wide-flight', form: 'wide', dark: false, stage: flight },
]

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore' })
try {
  await waitForServer()
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    pipe: false,
    // --use-mock-keychain: a full Chrome on macOS otherwise asks the Keychain for its cookie
    // encryption key on first launch of a fresh profile — a prompt nobody running this wants.
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--use-mock-keychain'],
  })
  await mkdir(join(root, 'public', 'screenshots'), { recursive: true })
  for (const scene of SCENES) {
    const page = await browser.newPage()
    const { width, height } = VIEWPORTS[scene.form]
    await page.setViewport({ width, height, deviceScaleFactor: 2, isMobile: scene.form === 'narrow', hasTouch: scene.form === 'narrow' })
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scene.dark ? 'dark' : 'light' }])
    await page.evaluateOnNewDocument((progress: unknown) => {
      localStorage.clear()
      localStorage.setItem('flappy-hippo.progress', JSON.stringify(progress))
      localStorage.setItem('flappy-hippo.settings', JSON.stringify({ difficulty: 'normal', sound: true, haptics: true }))
    }, PROGRESS)
    // "Network idle" is not a reliable signal against a dev server; the game hook is.
    await page.goto(URL, { waitUntil: 'load' })
    await page.waitForFunction(() => '__flappyHippo' in window)
    await page.evaluate(() => document.fonts.ready)
    await sleep(500)
    await scene.stage(page)
    const path = join(root, 'public', 'screenshots', `${scene.file}.png`)
    await page.screenshot({ path, captureBeyondViewport: false })
    console.log(`${scene.file}.png  ${width * 2}x${height * 2}`)
    await page.close()
  }
  await browser.close()
} finally {
  server.kill()
}
