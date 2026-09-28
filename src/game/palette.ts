import type { Palette, Tint } from './types.ts'

// The canvas can't use CSS, so every colour the game paints is declared once as a --game-* custom
// property in styles.css and read back here whenever the theme changes. One source of truth, and
// the DOM chrome around the canvas stays in step with the scene behind it.
function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

export function resolvePalette(dark: boolean): Palette {
  const brand = cssVar('--game-brand', dark ? '#5b9dff' : '#006aff')
  const gold = cssVar('--game-gold', '#f5a524')
  const melon = cssVar('--game-melon', dark ? '#7fe0a0' : '#178a48')
  // A step lighter than the brand and a softer edge: pipes must read, not dominate.
  const pipe = mix(brand, dark ? '#9cc4ff' : '#dbe9ff', 0.14)
  const bubbleEdge = dark ? '#d6a5ff' : '#ad4bf2'
  const wood = dark ? '#8a6f45' : '#d2a86a'
  const hippoDark = dark ? '#5f6a78' : '#5c6774'
  const grassLit = dark ? '#57a875' : '#63c57f'
  const grassShade = dark ? '#2b6a48' : '#2f9058'
  const earth = mix(wood, '#000000', 0.45)
  const confetti = [gold, pipe, melon]
  return {
    night: dark,
    sky: cssVar('--game-sky', dark ? '#111a26' : '#e5f0ff'),
    skyLow: cssVar('--game-sky-low', dark ? '#1b2735' : '#f2f7ff'),
    sun: 'rgba(255, 244, 226, 0.95)',
    sunHalo: 'rgba(255, 244, 226, 0.4)',
    moon: 'rgba(223, 227, 234, 0.9)',
    moonGlow: 'rgba(255, 255, 255, 0.1)',
    star: 'rgba(255, 255, 255, 0.85)',
    // The reward's gold, the world's blue, the melon's green: a party in the game's own paper.
    confetti,
    cloud: dark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.72)',
    cityFar: cssVar('--game-city-far', dark ? '#1b2533' : '#d9e8fe'),
    cityNear: cssVar('--game-city-near', dark ? '#26313f' : '#c6dcfd'),
    window: dark ? 'rgba(255, 230, 160, 0.18)' : 'rgba(255, 255, 255, 0.6)',
    haze: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.8)',
    hazeNear: dark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.4)',
    ground: cssVar('--game-ground', dark ? '#2c3646' : '#dee2e6'),
    groundLine: dark ? 'rgba(0, 0, 0, 0.32)' : 'rgba(0, 0, 0, 0.09)',
    groundHighlight: dark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.5)',
    // Greenery. The grass is foreground: saturated, dark enough to read on the bricks. The hedge
    // sits one layer back: a step paler and cooler. Lit tones lean yellow, shade tones lean blue.
    groundGrass: mix(grassLit, grassShade, 0.45),
    earth,
    clod: mix(wood, '#000000', 0.28),
    earthDeep: mix(earth, '#000000', 0.22),
    grassLit,
    grassShade,
    grassShadow: dark ? 'rgba(0, 0, 0, 0.28)' : 'rgba(22, 62, 44, 0.14)',
    // The hedge sits behind the pipes and should stay there: a step toward the sky's own colour.
    bushLit: mix(dark ? '#4c8a63' : '#93d3a6', dark ? '#111a26' : '#e5f0ff', 0.18),
    bushShade: mix(dark ? '#2f5e46' : '#5fb07d', dark ? '#111a26' : '#e5f0ff', 0.18),
    bushEdge: mix(dark ? '#1e4232' : '#3d8a5e', dark ? '#111a26' : '#e5f0ff', 0.18),
    flower: dark ? '#e8ecf2' : '#ffffff',
    flowerCenter: cssVar('--game-gold', '#e8930c'),
    wood,
    postbox: dark ? '#c99a2e' : '#e9b83d',
    lamp: dark ? '#3e4b5c' : '#8a97ab',
    pipe,
    pipeEdge: mix(cssVar('--game-pipe-edge', dark ? '#1f4f9e' : '#00479f'), brand, 0.3),
    pipeLight: mix(brand, '#ffffff', 0.34),
    text: cssVar('--game-text', dark ? '#dde3ec' : '#1f2430'),
    brand,
    gold,
    melon,
    melonFlesh: cssVar('--game-melon-flesh', dark ? '#ff7a9a' : '#e8395f'),
    melonRind: '#2f8a4a',
    melonSeed: 'rgba(38, 30, 34, 0.85)',
    bubbleEdge,
    bubbleSkin: alpha(bubbleEdge, 0.22),
    bubbleSkinInner: alpha(bubbleEdge, 0.05),
    bubbleGlow: alpha(bubbleEdge, 0.5),
    bubbleLilac: mix(bubbleEdge, '#ffffff', 0.7),
    shieldInk: cssVar('--game-shield', dark ? '#d6a5ff' : '#12307f'),
    shieldFace: '#dcb8ff',
    shieldFaceDeep: '#ad4bf2',
    shieldRimLit: '#2f63e8',
    shieldRim: '#10318f',
    shieldMark: '#10318f',
    confettiBack: confetti.map((color) => mix(color, '#000000', 0.22)),
    confettiEdge: confetti.map((color) => mix(color, '#000000', 0.42)),
    catCoat: mix(hippoDark, '#000000', 0.5),
    catLine: mix(hippoDark, '#000000', 0.78),
    dogLight: mix(wood, '#ffffff', 0.45),
    dogShade: mix(wood, hippoDark, 0.16),
    hippoBody: dark ? '#9aa6b8' : '#93a1b5',
    hippoShade: dark ? 'rgba(95, 106, 120, 0.26)' : 'rgba(92, 103, 116, 0.26)',
    hippoDark,
    hippoLight: dark ? '#bcc7d6' : '#b6c1d1',
    hippoEar: '#e8a2b0',
    wing: dark ? '#e8ecf2' : '#f4f6f9',
  }
}

/** Particle colours, keyed by the tint the simulation asked for. */
export function tintColor(p: Palette, tint: Tint): string {
  return tint === 'melon' ? p.melonFlesh : tint === 'pot' ? p.wood : p.shieldInk
}

/** `hex` (#rrggbb) at opacity `a`; anything else is returned as it is. */
export function alpha(hex: string, a: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

/** A colour between two hex colours, `t` of the way from `a` to `b`. For variants of one thing. */
export function mix(a: string, b: string, t: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return a
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (shift: number) => {
    const va = (pa >> shift) & 255
    const vb = (pb >> shift) & 255
    return Math.round(va + (vb - va) * t)
  }
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`
}
