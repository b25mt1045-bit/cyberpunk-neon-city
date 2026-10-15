import { useEffect, useRef } from 'react'
import { useApp } from '../store'

/**
 * Crosshair cursor for fine pointers. Expands into a lock-on ring over anything clickable,
 * whether that's an HTML control or a hologram in the 3D scene (store.pointerHint).
 */
export function Cursor() {
  const el = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    document.documentElement.classList.add('custom-cursor')
    const node = el.current!
    let x = -100
    let y = -100
    let raf = 0

    const move = (e: PointerEvent) => {
      x = e.clientX
      y = e.clientY
      const target = e.target as Element | null
      const html = !!target?.closest('a, button, [role="button"], input, select, textarea, summary')
      node.dataset.active = String(html || useApp.getState().pointerHint)
      node.dataset.visible = 'true'
    }
    const leave = () => (node.dataset.visible = 'false')
    const loop = () => {
      node.style.transform = `translate3d(${x}px, ${y}px, 0)`
      raf = requestAnimationFrame(loop)
    }
    const unsub = useApp.subscribe((s) => {
      if (s.pointerHint) node.dataset.active = 'true'
    })

    window.addEventListener('pointermove', move)
    document.addEventListener('pointerleave', leave)
    raf = requestAnimationFrame(loop)
    return () => {
      document.documentElement.classList.remove('custom-cursor')
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', leave)
      cancelAnimationFrame(raf)
      unsub()
    }
  }, [])

  return (
    <div ref={el} className="hud-cursor" data-visible="false" data-active="false" aria-hidden>
      <span className="hud-cursor__ring" />
      <span className="hud-cursor__h" />
      <span className="hud-cursor__v" />
    </div>
  )
}
