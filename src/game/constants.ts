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
/** The hippo is drawn a little larger than its hitbox: the anchor of the scene, and a fair hitbox. */
export const HIPPO_DRAW_SCALE = 1.1
/**
 * The hippo's line. With the draw scale it lands at ~1.65 — heavier than a pipe's 1.2, so the
 * hippo reads first, but still in proportion to a 30-unit character: line weight follows role,
 * it does not replace it.
 */
export const HIPPO_OUTLINE = 1.5
/** Horizontal position of the hippo as a share of the field width, clamped to these bounds. */
export const HIPPO_X_RATIO = 0.26
export const HIPPO_X_MIN = 62
export const HIPPO_X_MAX = 116

/** A slim wall — two rows of small bricks — so the field keeps its height for flying. */
export const GROUND_HEIGHT = 16
/** The brick grid: SCENE_PERIOD must be a multiple of the width, the street roots in its joints. */
export const BRICK_WIDTH = 20
export const BRICK_HEIGHT = 8

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
/** Pipes are drawn with a lighter hand than the hippo: a thinner edge, soft round shading. */
export const PIPE_OUTLINE = 1.2
// Light comes from the top left: a soft highlight on the left, a soft shade on the right
export const PIPE_HIGHLIGHT = 'rgba(255, 255, 255, 0.2)'
export const PIPE_SHADE = 'rgba(0, 0, 0, 0.1)'
export const CAP_SHADOW = 'rgba(0, 0, 0, 0.1)'

export const PICKUP_RADIUS = 11
/** Score a melon is worth. */
export const MELON_POINTS = 3
/** Share of pipe slots that carry a melon, and the rarer shield. */
export const MELON_CHANCE = 0.4
/** How far above or below the last gap a melon may hang, as a share of the gap jump. */
export const MELON_REACH = 0.75
export const SHIELD_CHANCE = 0.07
/** Pipes to clear before the first shield can appear. */
export const SHIELD_EARLIEST_PIPE = 5
/** Shields stack — up to this many charges, one hit each. */
export const MAX_SHIELDS = 3
/** How long a popped shield keeps the hippo solid, so it can fly clear of the pipe. */
export const INVULNERABLE_MS = 1000
/** The bubble grows in over this long when a shield is picked up… */
export const SHIELD_IN_MS = 240
/** …and the crack ring rings out over this long when one pops. */
export const SHIELD_POP_MS = 320
/** Little numbers that rise from a pickup: how long they live. */
export const FLOATER_MS = 800
/** The screen shudders for this long on a crash. */
export const SHAKE_MS = 260

// The later stages. A long round keeps getting harder, but never by chance: everything new is
// telegraphed and can be answered with skill.

/**
 * Testing switch, code only: brings the stages forward to 10 and 20 points so a moving pipe or a
 * pot is a minute away, not ten. The title card says so while it is on. Ship with it off.
 */
export const EARLY_STAGES = true
/** Scores at which the stages begin: pipes on the move, then flower pots falling from balconies. */
export const STAGE_MOVERS = EARLY_STAGES ? 10 : 50
export const STAGE_POTS = EARLY_STAGES ? 20 : 100
/**
 * The top of the game. Everything that tightens with the score — speed, spacing, gap, how many
 * pipes move and how far, how many pots fall — reaches its final value here and holds. Past it a
 * round is a test of endurance, not of a game that keeps escalating until no one can play it.
 */
export const TOP_SCORE = 500

export const POT_RADIUS = 9
/** A pot falls with a third of the hippo's gravity and never faster than this: a warning first. */
export const POT_GRAVITY = 520
export const POT_MAX_FALL = 300
/** How far above or below the last gap a pot comes down as it passes the hippo, as a share of the jump. */
export const POT_AIM = 0.6
/** Where a pot's centre is while it stands on its balcony's cap (see render/pots.ts). */
export const POT_REST_Y = 13.4
/** Pipe slots between two pots, at least. */
export const POT_SPACING = 2

/** A moving pipe's gap swings up and down once every this many seconds. */
export const MOVER_PERIOD_S = 2.6
/** What a moving pipe leaves the random walk of the jump, at least. */
export const MOVER_MIN_JUMP = 24

/** The scenery repeats every two short sides, so the parallax loop is never visible. */
export const SCENE_PERIOD = SHORT_SIDE * 2
export const HAZE_HEIGHT = 120
export const HAZE_NEAR_HEIGHT = 90

export const CLOUD_FALL_GRAVITY = 1200
export const CLOUD_STAGGER_S = 0.05
export const CLOUD_SPIN = 0.9
export const CLOUD_FALL_DISTANCE = 220
export const CLOUD_RISE_OMEGA = 10

/** Every this many points confetti flies. */
export const MILESTONE_STEP = 10
/** Pieces per milestone, and the most a big milestone throws. */
export const CONFETTI_BASE = 28
export const CONFETTI_MAX = 70
/** Paper: little gravity, a lot of drag, so it stops quickly and flutters down. */
export const CONFETTI_GRAVITY = 260
export const CONFETTI_DRAG = 1.4
/** Launch speed as a multiple of the field's height, so the paper reaches the hippo on any field. */
export const CONFETTI_SPEED: readonly [number, number] = [1.4, 2.1]
export const CONFETTI_LIFE_S = 2.6

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
