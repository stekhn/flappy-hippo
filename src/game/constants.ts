// Tuning numbers for the simulation, all in world units (see world.ts). The world's short side is
// always SHORT_SIDE units, so a "gap of 130" means the same thing on every screen.

/** The short side of the play field, in world units. The long side follows the screen. */
export const SHORT_SIDE = 320
/** Cap on how long the long side may get, so a very tall phone doesn't get an endless field. */
export const MAX_ASPECT = 2.3
/**
 * How far one world unit may be blown up in CSS pixels. A phone lands around 1.2 and fills the
 * screen; without a cap a desktop browser would reach 2.8 and the hippo would fill a third of it.
 * Past the cap the board is centred and framed instead (see the canvas styling in styles.css).
 */
export const MAX_ZOOM = 2.2

export const GRAVITY = 1500
export const FLAP_VELOCITY = -420
/** Falling faster than this looks like a rock, not a hippo. */
export const MAX_FALL_SPEED = 620

export const HIPPO_RADIUS = 14
/** Horizontal position of the hippo as a share of the field width, clamped to these bounds. */
export const HIPPO_X_RATIO = 0.26
export const HIPPO_X_MIN = 62
export const HIPPO_X_MAX = 116

export const GROUND_HEIGHT = 26
export const BRICK_WIDTH = 32
export const BRICK_HEIGHT = 12

export const PIPE_WIDTH = 56
export const PIPE_CAP_HEIGHT = 12
export const PIPE_CAP_OVERHANG = 4
/** Pipe bodies run past the frame edge and into the ground so no end line shows. */
export const PIPE_OVERRUN = 4
export const PIPE_BAND_WIDTH = 6
export const PIPE_BAND_INSET = 3
export const CAP_SHADOW_HEIGHT = 3
/** Smallest distance between a gap's edge and the ceiling or the ground. */
export const GAP_MARGIN = 30

export const OUTLINE = 1.5
export const INNER_LINE = 1.1
// Light comes from the top left: highlight bands left, shade bands right
export const PIPE_HIGHLIGHT = 'rgba(255, 255, 255, 0.22)'
export const PIPE_SHADE = 'rgba(0, 0, 0, 0.16)'
export const CAP_SHADOW = 'rgba(0, 0, 0, 0.14)'

export const PICKUP_RADIUS = 11
/** Score a melon is worth. */
export const MELON_POINTS = 3
/** Share of pipe slots that carry a melon, and the rarer shield. */
export const MELON_CHANCE = 0.4
export const SHIELD_CHANCE = 0.07
/** Pipes to clear before the first shield can appear. */
export const SHIELD_EARLIEST_PIPE = 5
/** Shields stack — up to this many charges, one hit each. */
export const MAX_SHIELDS = 3
/** How long a popped shield keeps the hippo solid, so it can fly clear of the pipe. */
export const INVULNERABLE_MS = 1000

/** The scenery repeats every two short sides, so the parallax loop is never visible. */
export const SCENE_PERIOD = SHORT_SIDE * 2
export const HAZE_HEIGHT = 120
export const HAZE_NEAR_HEIGHT = 90

export const CLOUD_FALL_GRAVITY = 1200
export const CLOUD_STAGGER_S = 0.05
export const CLOUD_SPIN = 0.9
export const CLOUD_FALL_DISTANCE = 220
export const CLOUD_RISE_OMEGA = 10

/** Every this many points the sky throws a party. */
export const FIREWORK_STEP = 10
export const FIREWORK_MAX = 6
export const ROCKET_RISE_MS = 700
export const ROCKET_BURST_MS = 900
export const ROCKET_SPACING_MS = 180

export const SUN_RADIUS = 17
export const MOON_RADIUS = 16

export const FLAP_ANIMATION_MS = 300
/** A stray tap right after a crash must not skip the game-over card. */
export const RESTART_DELAY_MS = 450
/** Coming back from a pause counts down 3-2-1 before the hippo moves again. */
export const COUNTDOWN_MS = 1500
/** How long after a crash the scene keeps animating (falling sky, dust) before it goes still. */
export const OVER_SETTLE_MS = 3000
/** Frames longer than this (a backgrounded tab, a slow phone) are clamped, never simulated. */
export const MAX_FRAME_S = 1 / 30

export const OVER_TITLES = [
  'Vorbei',
  'Autsch',
  'Platsch',
  'Hoppla',
  'Bruchlandung',
  'Knapp vorbei',
  'Rums',
  'Schade',
] as const
