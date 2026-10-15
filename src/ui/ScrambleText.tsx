import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store'

const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽ01<>/\\#*+=_-[]'

/**
 * Text that resolves from random glyphs, left to right, whenever `text` changes.
 * Reduced motion shows the final text immediately.
 */
export function ScrambleText({ text, duration = 650, className }: { text: string; duration?: number; className?: string }) {
  const [shown, setShown] = useState(text)
  const frame = useRef(0)

  useEffect(() => {
    if (useApp.getState().reducedMotion) {
      setShown(text)
      return
    }
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const resolved = Math.floor(t * text.length)
      let out = text.slice(0, resolved)
      for (let i = resolved; i < text.length; i++) {
        out += text[i] === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
      }
      setShown(out)
      if (t < 1) frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame.current)
  }, [text, duration])

  // screen readers get the real text, not the scramble
  return (
    <span className={className}>
      <span aria-hidden>{shown}</span>
      <span className="sr-only">{text}</span>
    </span>
  )
}
