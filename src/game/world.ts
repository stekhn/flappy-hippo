import {
  GROUND_HEIGHT,
  MAX_ZOOM,
  HIPPO_X_MAX,
  HIPPO_X_MIN,
  HIPPO_X_RATIO,
  MAX_ASPECT,
  SHORT_SIDE,
} from './constants.ts'

/**
 * The play field in world units. Phones are tall and laptops are wide, so instead of squeezing one
 * fixed 3:2 frame into both, the field keeps a constant short side (SHORT_SIDE) and lets the long
 * side follow the screen. A gap of 130 units is then the same challenge everywhere; a portrait
 * phone simply gets more sky above and below, a laptop more runway ahead.
 */
export interface World {
  width: number
  height: number
  /** Top edge of the ground strip — the floor the hippo must not touch. */
  groundY: number
  /** The hippo's fixed horizontal position. */
  hippoX: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** On a display the board no longer fills: the share of the long side kept clear either side, and the widest field. */
const DESKTOP_MARGIN = 0.11
const DESKTOP_ASPECT = 1.9

/** Fits the play field to a CSS pixel box. Past MAX_ZOOM the long side keeps following the box, less a margin. */
export function fitWorld(cssWidth: number, cssHeight: number): World {
  const safeW = Math.max(cssWidth, 1)
  const safeH = Math.max(cssHeight, 1)
  const aspect = safeW / safeH
  const boxShort = aspect >= 1 ? safeH : safeW
  const boxLong = aspect >= 1 ? safeW : safeH
  const framed = boxShort > SHORT_SIDE * MAX_ZOOM
  const shortPx = Math.min(boxShort, SHORT_SIDE * MAX_ZOOM)
  const longPx = framed ? boxLong * (1 - DESKTOP_MARGIN * 2) : boxLong
  const stretch = clamp(longPx / shortPx, 1, framed ? DESKTOP_ASPECT : MAX_ASPECT)
  const long = Math.round(SHORT_SIDE * stretch)
  const width = aspect >= 1 ? long : SHORT_SIDE
  const height = aspect >= 1 ? SHORT_SIDE : long
  return {
    width,
    height,
    groundY: height - GROUND_HEIGHT,
    hippoX: Math.round(clamp(width * HIPPO_X_RATIO, HIPPO_X_MIN, HIPPO_X_MAX)),
  }
}

/**
 * CSS size of the canvas inside its box: the world's aspect ratio, scaled up until one side
 * touches the box or the zoom cap is reached. On a phone that fills the screen; on a large display
 * the board stops growing and sits centred in the page instead.
 */
export function canvasSize(world: World, cssWidth: number, cssHeight: number) {
  const scale = Math.min(cssWidth / world.width, cssHeight / world.height, MAX_ZOOM)
  return { width: world.width * scale, height: world.height * scale, scale }
}
