import type { MouseEvent } from 'react'

/**
 * Hands focus back after a tap or click. Without this the control the player just touched keeps
 * focus, and the next press of the space bar re-triggers that control instead of flapping.
 * Keyboard activation (detail === 0) keeps its focus, so tabbing through the UI still works.
 */
export function blurIfPointer(event: MouseEvent<HTMLElement>): void {
  if (event.detail === 0) return
  event.currentTarget.blur()
}
