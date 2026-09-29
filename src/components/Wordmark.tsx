import { useCallback, useState } from 'react'
import type { SyntheticEvent } from 'react'
import { grainUrl } from './grain.ts'

interface WordmarkProps {
  height: number
  dark: boolean
}

/** The lettering is lit for daylight; at night it is dimmed to sit in the dark sky. */
export const WORDMARK_NIGHT = 0.72

/** How much of the room above the board the tilted lettering fills. */
const FILL = 1.06

/** The tilt the lettering hangs at. */
const TILT = -10

/** The page's specks, taken finer and fainter: the lettering is small and brightly lit. */
const GRAIN = { tile: 120, strength: 0.7 }

/**
 * A tilt turns the box out past the one it is laid out in without widening that one. The caller
 * aligns the laid-out box, which puts the lettering's lower edge on the board's top edge and lets
 * only the low corner reach further in, well clear of the score in the middle.
 */
export function Wordmark({ height, dark }: WordmarkProps) {
  const [aspect, setAspect] = useState(1600 / 772)
  const rad = (Math.abs(TILT) * Math.PI) / 180
  const tall = Math.round((height * FILL) / (Math.cos(rad) + aspect * Math.sin(rad)))

  const onLoad = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget
    if (img.naturalHeight > 0) setAspect(img.naturalWidth / img.naturalHeight)
  }, [])

  return (
    <span
      className="pointer-events-none relative inline-block"
      style={{
        transform: `rotate(${TILT}deg)`,
        filter: dark ? `brightness(${WORDMARK_NIGHT})` : undefined,
      }}
      aria-hidden="true"
    >
      <img
        src="wordmark.webp"
        alt=""
        width={1600}
        height={772}
        decoding="async"
        onLoad={onLoad}
        className="block"
        style={{ height: tall, width: 'auto', maxWidth: '90vw' }}
      />
      {/* The page's specks again, masked to the lettering so they do not settle on the sky. */}
      <span
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${grainUrl()})`,
          backgroundSize: `${GRAIN.tile}px ${GRAIN.tile}px`,
          opacity: GRAIN.strength,
          maskImage: 'url(wordmark.webp)',
          WebkitMaskImage: 'url(wordmark.webp)',
          maskSize: '100% 100%',
          WebkitMaskSize: '100% 100%',
        }}
      />
    </span>
  )
}
