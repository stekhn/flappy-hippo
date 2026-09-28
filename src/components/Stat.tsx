import type { ReactNode } from 'react'

/**
 * A figure with its icon, inline: "🏆 Record 29", "⭐ 6 points", "🍉 3 melons". The one way a
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
  tone?: 'ink' | 'brand' | 'gold' | 'melon' | 'shield'
  animate?: boolean
  children: ReactNode
}) {
  const color = { ink: '', brand: 'text-brand', gold: 'text-gold-ink', melon: 'text-melon', shield: 'text-shield' }[
    tone
  ]
  return (
    <span className={`t-label inline-flex items-center gap-1.5 ${color} ${animate ? 'animate-pop' : ''}`}>
      {icon}
      <span>{children}</span>
    </span>
  )
}
