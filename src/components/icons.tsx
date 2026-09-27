import type { SVGProps } from 'react'

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

export function IconTrophy(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 4h8v5a4 4 0 0 1 -8 0z" />
      <path d="M8 5.5h-3a3 3 0 0 0 3 3" />
      <path d="M16 5.5h3a3 3 0 0 1 -3 3" />
      <path d="M12 13v3" />
      <path d="M9 20h6" />
      <path d="M10 16h4l1 4h-6z" />
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

export function IconMelon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 16a9 9 0 0 1 18 0z" fill="currentColor" stroke="none" opacity="0.25" />
      <path d="M3 16a9 9 0 0 1 18 0z" />
      <path d="M6 16a6 6 0 0 1 12 0" />
      <path d="M10 14.5h.01" />
      <path d="M14 14.5h.01" />
      <path d="M12 12h.01" />
    </Icon>
  )
}

export function IconShield(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3l7 3v5.5c0 4 -3 7.4 -7 8.5c-4 -1.1 -7 -4.5 -7 -8.5v-5.5z" />
    </Icon>
  )
}

export function IconGear(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5l1.2 2.2a7.6 7.6 0 0 1 2 .8l2.4 -.6l1.5 2.6l-1.6 1.9a7.6 7.6 0 0 1 0 2.2l1.6 1.9l-1.5 2.6l-2.4 -.6a7.6 7.6 0 0 1 -2 .8l-1.2 2.2h-3l-1.2 -2.2a7.6 7.6 0 0 1 -2 -.8l-2.4 .6l-1.5 -2.6l1.6 -1.9a7.6 7.6 0 0 1 0 -2.2l-1.6 -1.9l1.5 -2.6l2.4 .6a7.6 7.6 0 0 1 2 -.8l1.2 -2.2z" />
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

export function IconHome(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 11l8 -7l8 7" />
      <path d="M6 10v9h12v-9" />
    </Icon>
  )
}

/** The hippo's face from the app icon, for the title card. Mirrors assets/icon.svg. */
export function HippoMark(props: IconProps) {
  return (
    <svg viewBox="4 4.5 16 15.5" width="64" height="62" aria-hidden="true" focusable="false" {...props}>
      <circle cx="7.9" cy="7.4" r="1.9" fill="#93a1b5" />
      <circle cx="16.1" cy="7.4" r="1.9" fill="#93a1b5" />
      <circle cx="7.9" cy="7.6" r="0.9" fill="#e8a2b0" />
      <circle cx="16.1" cy="7.6" r="0.9" fill="#e8a2b0" />
      <ellipse cx="12" cy="12.6" rx="7" ry="5.9" fill="#93a1b5" />
      <ellipse cx="12" cy="15.6" rx="5.1" ry="3.5" fill="#b6c1d1" />
      <ellipse cx="9.9" cy="15.1" rx="0.85" ry="1.1" fill="#3e4753" />
      <ellipse cx="14.1" cy="15.1" rx="0.85" ry="1.1" fill="#3e4753" />
      <circle cx="9.5" cy="10.5" r="1.25" fill="#3e4753" />
      <circle cx="14.5" cy="10.5" r="1.25" fill="#3e4753" />
    </svg>
  )
}
