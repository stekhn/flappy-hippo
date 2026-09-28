import type { SVGProps } from 'react'
import { MELON_TILT_DEG } from '../game/constants.ts'

// A handful of hand-rolled icons in the Tabler style (24px grid, 2px round strokes). Cheaper than
// an icon package for the dozen glyphs this game needs, and they inherit currentColor.

type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function IconPlay(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 4v16l13 -8z" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function IconPause(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor" stroke="none" />
      <rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function IconRestart(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 11a8 8 0 1 0 -2.5 5.8" />
      <path d="M20 5v6h-6" />
    </Icon>
  )
}

export function IconSoundOn(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M13 4.5v15l-5 -4h-3a1 1 0 0 1 -1 -1v-5a1 1 0 0 1 1 -1h3z" />
      <path d="M16.5 9a3.5 3.5 0 0 1 0 6" />
      <path d="M19.5 6.5a7.5 7.5 0 0 1 0 11" />
    </Icon>
  )
}

export function IconSoundOff(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M13 4.5v15l-5 -4h-3a1 1 0 0 1 -1 -1v-5a1 1 0 0 1 1 -1h3z" />
      <path d="M17 9.5l4 5" />
      <path d="M21 9.5l-4 5" />
    </Icon>
  )
}

export function IconMenu(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </Icon>
  )
}

export function IconClose(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6l-12 12" />
    </Icon>
  )
}

/** Filled: it stands next to a number, in the number's colour, and must read at 18px. */
export function IconTrophy(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 4h8v5a4 4 0 0 1 -8 0z" fill="currentColor" />
      <path d="M8 5.5h-3a3 3 0 0 0 3 3" />
      <path d="M16 5.5h3a3 3 0 0 1 -3 3" />
      <path d="M12 13v3" />
      <path d="M10 16h4l1 4h-6z" fill="currentColor" />
      <path d="M9 20h6" />
    </Icon>
  )
}

export function IconStar(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="M12 3.5l2.6 5.3l5.9 .9l-4.3 4.1l1 5.8l-5.2 -2.7l-5.2 2.7l1 -5.8l-4.3 -4.1l5.9 -.9z"
        fill="currentColor"
        stroke="none"
      />
    </Icon>
  )
}

/**
 * A wedge: green rind in the current colour round red flesh with three pips, so it is not a
 * lime. Tilted like the melon in the game, the cut face up.
 */
export function IconMelon(props: IconProps) {
  return (
    <Icon {...props}>
      <g transform={`rotate(${MELON_TILT_DEG} 12 12)`}>
        <path d="M3 16a9 9 0 0 1 18 0z" fill="currentColor" />
        <path d="M5.6 16a6.4 6.4 0 0 1 12.8 0z" fill="var(--game-melon-flesh)" stroke="none" />
        <circle cx="9.5" cy="14.4" r="1.05" fill="#2a1f24" stroke="none" />
        <circle cx="14.5" cy="14.4" r="1.05" fill="#2a1f24" stroke="none" />
        <circle cx="12" cy="11.9" r="1.05" fill="#2a1f24" stroke="none" />
      </g>
    </Icon>
  )
}

export function IconRotate(props: IconProps) {
  return (
    <svg
      viewBox="0 0 256 256"
      width="21"
      height="21"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M208.49,224.49l-24,24a12,12,0,0,1-17-17L171,228H80a28,28,0,0,1-28-28V108a12,12,0,0,1,24,0v92a4,4,0,0,0,4,4h91l-3.52-3.51a12,12,0,0,1,17-17l24,24A12,12,0,0,1,208.49,224.49ZM80,76a12,12,0,0,0,8.49-20.49L85,52h91a4,4,0,0,1,4,4v92a12,12,0,0,0,24,0V56a28,28,0,0,0-28-28H85l3.52-3.52a12,12,0,0,0-17-17l-24,24a12,12,0,0,0,0,17l24,24A12,12,0,0,0,80,76Z" />
    </svg>
  )
}

export function IconShield(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3l7 3v5.5c0 4 -3 7.4 -7 8.5c-4 -1.1 -7 -4.5 -7 -8.5v-5.5z" fill="currentColor" />
      <path d="M12 6.4l4.2 1.8v3.4c0 2.5 -1.8 4.6 -4.2 5.4c-2.4 -0.8 -4.2 -2.9 -4.2 -5.4v-3.4z" fill="var(--game-shield-inlay)" stroke="none" />
    </Icon>
  )
}

/** Eight teeth about the centre, computed rather than drawn, so the hole sits in the middle. */
export function IconGear(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M10.19 5.24L10.57 2.41L13.43 2.41L13.81 5.24L15.50 5.94L17.77 4.20L19.80 6.23L18.06 8.50L18.76 10.19L21.59 10.57L21.59 13.43L18.76 13.81L18.06 15.50L19.80 17.77L17.77 19.80L15.50 18.06L13.81 18.76L13.43 21.59L10.57 21.59L10.19 18.76L8.50 18.06L6.23 19.80L4.20 17.77L5.94 15.50L5.24 13.81L2.41 13.43L2.41 10.57L5.24 10.19L5.94 8.50L4.20 6.23L6.23 4.20L8.50 5.94z" />
    </Icon>
  )
}

export function IconChart(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 20v-7" />
      <path d="M12 20v-13" />
      <path d="M19 20v-10" />
    </Icon>
  )
}

export function IconHelp(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.6 .2 -.7 .8 -.7 1.4" />
      <path d="M12 16.5h.01" />
    </Icon>
  )
}

export function IconInstall(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4v11" />
      <path d="M8 11l4 4l4 -4" />
      <path d="M5 19h14" />
    </Icon>
  )
}

export function IconCheck(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12.5l4.5 4.5l9.5 -10" />
    </Icon>
  )
}

export function IconShare(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3v12" />
      <path d="M8 7l4 -4l4 4" />
      <path d="M6 12v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1 -1v-7" />
    </Icon>
  )
}

export function IconTrash(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
      <path d="M9 7v-3h6v3" />
    </Icon>
  )
}

export function IconHome(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 11l8 -7l8 7" />
      <path d="M6 10v9h12v-9" />
    </Icon>
  )
}
