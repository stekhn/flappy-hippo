import { useLayoutEffect, useRef, useState } from 'react'

interface WordmarkProps {
  height: number
  claim: string | null
  dark: boolean
}

/** The lettering is lit for daylight; at night it is dimmed to sit in the dark sky. */
export const WORDMARK_NIGHT = 0.85

export function Wordmark({ height, claim, dark }: WordmarkProps) {
  const imageHeight = Math.round(height * (claim ? 0.64 : 0.86))
  const claimSize = Math.round(imageHeight * 0.13)
  const group = useRef<HTMLDivElement>(null)
  const pill = useRef<HTMLParagraphElement>(null)
  // The claim is tilted, and a rotation hangs below the box it is laid out in without widening
  // it. Measured and given back as a margin, so the caller's bottom edge is the one you see.
  const [overhang, setOverhang] = useState(0)

  useLayoutEffect(() => {
    const box = group.current
    const tilted = pill.current
    if (!box || !tilted) {
      setOverhang(0)
      return
    }
    // Both boxes move together with the margin, so this difference is stable.
    const below = tilted.getBoundingClientRect().bottom - box.getBoundingClientRect().bottom
    setOverhang(Math.max(0, Math.round(below)))
  }, [imageHeight, claimSize, claim])

  return (
    <div
      ref={group}
      className="pointer-events-none flex flex-col items-center justify-center"
      style={{ filter: dark ? `brightness(${WORDMARK_NIGHT})` : undefined, marginBottom: overhang }}
      aria-hidden="true"
    >
      <img
        src="wordmark.webp"
        alt=""
        width={1600}
        height={826}
        decoding="async"
        className="relative z-10"
        style={{ height: imageHeight, width: 'auto', maxWidth: '90vw' }}
      />
      {claim && (
        <p
          ref={pill}
          className="t-label relative z-0 rounded-full whitespace-nowrap"
          style={{
            fontSize: claimSize,
            lineHeight: 1.2,
            padding: `${claimSize * 0.32}px ${claimSize * 1.1}px`,
            marginTop: -claimSize * 0.85,
            background: '#dcf23e',
            color: '#12307f',
            boxShadow: `0 ${Math.max(2, claimSize * 0.14)}px 0 #9fc11d`,
            transform: `translateX(${imageHeight * 0.1}px) rotate(-10deg)`,
          }}
        >
          {claim}
        </p>
      )}
    </div>
  )
}
