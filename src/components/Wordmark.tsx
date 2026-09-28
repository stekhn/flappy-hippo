interface WordmarkProps {
  height: number
  claim: string | null
  dark: boolean
}

/** The lettering is lit for daylight; at night it is dimmed to sit in the dark sky. */
const NIGHT = 0.85

export function Wordmark({ height, claim, dark }: WordmarkProps) {
  const imageHeight = Math.round(height * (claim ? 0.64 : 0.86))
  const claimSize = Math.round(imageHeight * 0.13)
  return (
    <div
      className="pointer-events-none flex flex-col items-center justify-center"
      style={{
        transform: `translateY(${claim ? -claimSize * 1.45 : -height * 0.1}px)`,
        filter: dark ? `brightness(${NIGHT})` : undefined,
      }}
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
