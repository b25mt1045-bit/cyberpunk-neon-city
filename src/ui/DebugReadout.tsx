import { useEffect, useRef } from 'react'
import { useApp } from '../store'

// M1 dev aid: live progress + section. Replaced by the HUD progress rail in M5.
export function DebugReadout() {
  const el = useRef<HTMLDivElement>(null)

  useEffect(
    () =>
      useApp.subscribe(({ progress, section }) => {
        if (el.current) el.current.textContent = `${(progress * 100).toFixed(1).padStart(5, '0')}% · ${section}`
      }),
    [],
  )

  return (
    <div
      ref={el}
      aria-hidden
      className="pointer-events-none fixed right-4 bottom-4 z-20 border border-cyan/40 px-3 py-1 font-mono text-xs text-cyan"
    >
      000.0% · hero
    </div>
  )
}
