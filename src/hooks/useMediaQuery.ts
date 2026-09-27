import { useEffect, useState } from 'react'

/** Tracks a media query live, so layout can follow a rotation without a reload. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    try {
      return matchMedia(query).matches
    } catch {
      return false
    }
  })
  useEffect(() => {
    const mq = matchMedia(query)
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return matches
}
