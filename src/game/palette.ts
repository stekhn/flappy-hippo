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
    firework: dark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.95)',
    cloud: dark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.72)',
    cityFar: cssVar('--game-city-far', dark ? '#1b2533' : '#d9e8fe'),
    cityNear: cssVar('--game-city-near', dark ? '#26313f' : '#c6dcfd'),
    window: dark ? 'rgba(255, 230, 160, 0.18)' : 'rgba(255, 255, 255, 0.6)',
    haze: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.8)',
    hazeNear: dark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.4)',
    ground: cssVar('--game-ground', dark ? '#2c3646' : '#dee2e6'),
    groundLine: dark ? 'rgba(0, 0, 0, 0.32)' : 'rgba(0, 0, 0, 0.09)',
    groundHighlight: dark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.5)',
    pipe: brand,
    pipeEdge: cssVar('--game-pipe-edge', dark ? '#1f4f9e' : '#00479f'),
    text: cssVar('--game-text', dark ? '#dde3ec' : '#1f2430'),
    brand,
    gold: cssVar('--game-gold', '#f5a524'),
    melon: '#f2426b',
    melonRind: '#2f8a4a',
    melonSeed: 'rgba(38, 30, 34, 0.85)',
    // Tinted rather than white: a white bubble disappears against the daytime sky.
    bubble: dark ? 'rgba(150, 214, 255, 0.5)' : 'rgba(96, 170, 255, 0.42)',
    bubbleEdge: dark ? 'rgba(190, 230, 255, 0.85)' : 'rgba(58, 138, 235, 0.7)',
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
