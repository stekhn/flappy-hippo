import type { Medal } from '../game/medals.ts'
import { BadgeSvg, GlossDisc } from './GlossDisc.tsx'
import { IconTrophy } from './icons.tsx'

/** The round's badge: a disc of metal, or a cut gem for the top tier. */
export function MedalBadge({ medal, size = 68 }: { medal: Medal; size?: number }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {medal.id === 'diamond' ? (
        <>
          <Gem medal={medal} />
          {/* The gem is drawn behind, so this stands in for the other tiers' trophy and keeps the
              badge's baseline with theirs. Without it the line it sits on grows. */}
          <span className="relative block" style={{ width: size * 0.4, height: size * 0.4 }} />
        </>
      ) : (
        <>
          <GlossDisc rim={medal.rim} dark={medal.dark} mid={medal.mid} light={medal.light} />
          <IconTrophy
            width={size * 0.4}
            height={size * 0.4}
            className="relative"
            style={{ color: medal.ink, opacity: 0.85 }}
          />
        </>
      )}
    </span>
  )
}

/** A brilliant cut: a table, three crown facets and three pavilion facets down to the point. */
function Gem({ medal }: { medal: Medal }) {
  const facets: [string, string][] = [
    ['M 15 24 L 24 9 L 28 24 Z', medal.light],
    ['M 24 9 L 40 9 L 36 24 L 28 24 Z', medal.mid],
    ['M 40 9 L 49 24 L 36 24 Z', medal.dark],
    ['M 15 24 L 28 24 L 32 56 Z', medal.mid],
    ['M 28 24 L 36 24 L 32 56 Z', medal.light],
    ['M 36 24 L 49 24 L 32 56 Z', medal.dark],
  ]
  return (
    <BadgeSvg>
      <path
        d="M 15 24 L 24 9 L 40 9 L 49 24 L 32 56 Z"
        fill={medal.rim}
        stroke={medal.rim}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {facets.map(([d, fill]) => (
        <path key={d} d={d} fill={fill} stroke={medal.rim} strokeWidth="0.9" strokeLinejoin="round" />
      ))}
      <path d="M 26 12 L 38 12" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" opacity="0.75" />
      <path d="M 30 27 L 31 48" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    </BadgeSvg>
  )
}
