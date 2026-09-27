import type { ReactNode } from 'react'

/**
 * A figure with its icon, inline: "🏆 Rekord 29", "⭐ 6 Punkte", "🍉 3 Melonen". The one way a
 * number is shown next to its meaning anywhere outside the menu's tiles — same face, same
 * size, icon and words in one colour.
 */
export function Stat({
  icon,
  tone = 'ink',
  animate = false,
  children,
}: {
  icon: ReactNode
  tone?: 'ink' | 'brand' | 'gold'
  animate?: boolean
  children: ReactNode
}) {
  const color = tone === 'gold' ? 'text-gold' : tone === 'brand' ? 'text-brand' : ''
  return (
    <span
      className={`t-label inline-flex items-center gap-1.5 ${color} ${animate ? 'animate-pop' : ''}`}
    >
      {icon}
      <span>{children}</span>
    </span>
  )
}
