import { useCallback, useEffect, useState } from 'react'
import { lockLandscape, readRotated, writeRotated } from '../orientation.ts'

/**
 * One control for playing sideways. A device that can lock its own screen does that and the view
 * is left alone; where it cannot, the view is turned instead. The turn is undone by turning the
 * device itself, since the stylesheet only applies it while the device is upright.
 */
export function useLandscape() {
  const [rotated, setRotated] = useState(readRotated)

  useEffect(() => {
    const root = document.documentElement
    if (rotated) root.dataset.rotate = 'true'
    else delete root.dataset.rotate
    writeRotated(rotated)
  }, [rotated])

  const toggle = useCallback(() => {
    if (rotated) {
      setRotated(false)
      return
    }
    void lockLandscape().then((locked) => setRotated(!locked))
  }, [rotated])

  return { rotated, toggle }
}
