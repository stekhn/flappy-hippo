import { Fragment } from 'react'
import type { ReactNode } from 'react'

/**
 * A message with `{slot}` placeholders, each replaced by a React node, so a sentence can carry
 * a styled number or a bold word without being split into translated fragments.
 */
export function Fill({ message, slots }: { message: string; slots: Record<string, ReactNode> }) {
  return (
    <>
      {message.split(/(\{[a-z]+\})/i).map((part, index) => {
        const slot = /^\{([a-z]+)\}$/i.exec(part)
        return <Fragment key={index}>{slot ? (slots[slot[1]] ?? part) : part}</Fragment>
      })}
    </>
  )
}
