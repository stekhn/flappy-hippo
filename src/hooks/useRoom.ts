import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

/** Free height above (and so below) the centred board; zero where the board fills the box. */
export function useRoom(box: RefObject<HTMLElement | null>, canvas: RefObject<HTMLCanvasElement | null>): number {
  const [room, setRoom] = useState(0)
  useEffect(() => {
    const boxEl = box.current
    const canvasEl = canvas.current
    if (!boxEl || !canvasEl) return
    const update = () =>
      setRoom(Math.max(0, Math.floor((boxEl.clientHeight - canvasEl.getBoundingClientRect().height) / 2)))
    const observer = new ResizeObserver(update)
    observer.observe(boxEl)
    observer.observe(canvasEl)
    update()
    return () => observer.disconnect()
  }, [box, canvas])
  return room
}
