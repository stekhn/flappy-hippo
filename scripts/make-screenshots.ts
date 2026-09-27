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

/** A round in progress: score, a shield, a melon to detour for, pipes ahead. */
async function flight(page: Page): Promise<void> {
  await page.evaluate(() => {
    const runtime = (window as Window & { __flappyHippo?: { flap(): void; inspect(): { state: any; world: any } } }).__flappyHippo!
    runtime.flap()
    const { state, world } = runtime.inspect()
    state.score = 27
    state.pipesCleared = 24
    state.melons = 1
    state.charges = 2
    state.hippoY = world.groundY * 0.5
    state.velocity = -150
    const gap = state.hippoY
    // The first pipe sits clear of the score at the top centre on a wide field, allowing for the
    // few frames it scrolls before the capture.
    const ahead = Math.max(world.hippoX + 150, world.width * 0.62)
    state.pipes = [
      { x: ahead, gapY: gap + 8, half: 62, passed: false },
      { x: ahead + 210, gapY: gap - 55, half: 62, passed: false },
      { x: ahead + 420, gapY: gap + 25, half: 62, passed: false },
    ]
    // The melon hangs between the hippo and the first pipe, in view on every field.
    state.pickups = [{ kind: 'melon', x: world.hippoX + 78, y: gap - 62, taken: false, seed: 1 }]
    state.nextSpawn = state.scrolled + ahead + 630
  })
  await sleep(80)
}

/** The round ends on a new record with a gold medal, and an achievement toast pops. */
async function over(page: Page): Promise<void> {
  await page.evaluate(() => {
    const runtime = (window as Window & { __flappyHippo?: { flap(): void; inspect(): { state: any; world: any } } }).__flappyHippo!
    runtime.flap()
    const { state, world } = runtime.inspect()
    state.score = 52
    state.pipesCleared = 49
    state.melons = 1
    state.hippoY = world.groundY - 30
    state.velocity = 400
    state.pipes = []
  })
  await sleep(1400)
}

async function awards(page: Page): Promise<void> {
  await page.click('button[aria-label="Menü öffnen"]')
  await sleep(300)
  await page.click('[role="tab"]:nth-child(3)')
  await sleep(500)
}

const SCENES: Scene[] = [
  { file: 'narrow-title', form: 'narrow', dark: false, stage: async () => {} },
  { file: 'narrow-flight', form: 'narrow', dark: false, stage: flight },
  { file: 'narrow-over', form: 'narrow', dark: true, stage: over },
  { file: 'narrow-awards', form: 'narrow', dark: true, stage: awards },
  { file: 'wide-flight', form: 'wide', dark: false, stage: flight },
  { file: 'wide-title', form: 'wide', dark: true, stage: async () => {} },
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
    await page.goto(URL, { waitUntil: 'networkidle0' })
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
