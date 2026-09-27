import type { Palette } from './types.ts'

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
  return {
    night: dark,
    sky: cssVar('--game-sky', dark ? '#111a26' : '#e5f0ff'),
    skyLow: cssVar('--game-sky-low', dark ? '#1b2735' : '#f2f7ff'),
    sun: 'rgba(255, 244, 226, 0.95)',
    sunHalo: 'rgba(255, 244, 226, 0.4)',
    moon: 'rgba(223, 227, 234, 0.9)',
    moonGlow: 'rgba(255, 255, 255, 0.1)',
    star: 'rgba(255, 255, 255, 0.85)',
    // Gold for the reward, violet for the magic, white for the sparkle: the palette's own accents.
    fireworks: dark ? ['#ffc65c', '#c4b5fd', '#ffffff'] : ['#f5a524', '#8b5cf6', '#ffffff'],
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
    grassLit: dark ? '#57a875' : '#63c57f',
    grassShade: dark ? '#2b6a48' : '#2f9058',
    grassShadow: dark ? 'rgba(0, 0, 0, 0.28)' : 'rgba(22, 62, 44, 0.14)',
    bushLit: dark ? '#4c8a63' : '#93d3a6',
    bushShade: dark ? '#2f5e46' : '#5fb07d',
    bushEdge: dark ? '#1e4232' : '#3d8a5e',
    flower: dark ? '#e8ecf2' : '#ffffff',
    flowerCenter: cssVar('--game-gold', '#e8930c'),
    wood: dark ? '#8a6f45' : '#d2a86a',
    postbox: dark ? '#c99a2e' : '#e9b83d',
    lamp: dark ? '#3e4b5c' : '#8a97ab',
    pipe: brand,
    pipeEdge: cssVar('--game-pipe-edge', dark ? '#1f4f9e' : '#00479f'),
    text: cssVar('--game-text', dark ? '#dde3ec' : '#1f2430'),
    brand,
    gold: cssVar('--game-gold', '#f5a524'),
    melon: cssVar('--game-melon', dark ? '#ff7a9a' : '#e8395f'),
    melonRind: '#2f8a4a',
    melonSeed: 'rgba(38, 30, 34, 0.85)',
    // The shield is the one violet thing in the game, so it can never be mistaken for a pipe.
    bubble: dark ? 'rgba(196, 181, 253, 0.45)' : 'rgba(124, 77, 255, 0.42)',
    bubbleEdge: cssVar('--game-shield', dark ? '#c4b5fd' : '#7c4dff'),
    hippoBody: dark ? '#9aa6b8' : '#93a1b5',
    hippoShade: dark ? 'rgba(95, 106, 120, 0.26)' : 'rgba(92, 103, 116, 0.26)',
    hippoDark: dark ? '#5f6a78' : '#5c6774',
    hippoLight: dark ? '#bcc7d6' : '#b6c1d1',
    hippoEar: '#e8a2b0',
    wing: dark ? '#e8ecf2' : '#f4f6f9',
  }
}

/** Particle colours, keyed by the tint the simulation asked for. */
export function tintColor(p: Palette, tint: 'melon' | 'bubble'): string {
  return tint === 'melon' ? p.melon : p.bubble
}

/** A colour between two hex colours, `t` of the way from `a` to `b`. For variants of one thing. */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (shift: number) => {
    const va = (pa >> shift) & 255
    const vb = (pb >> shift) & 255
    return Math.round(va + (vb - va) * t)
  }
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`
}
