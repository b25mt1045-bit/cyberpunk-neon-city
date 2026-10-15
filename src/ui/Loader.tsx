import { useEffect, useRef, useState } from 'react'
import { useApp, type BootStep } from '../store'
import { lockScroll } from '../scroll/useSmoothScroll'
import { fontsReady } from '../world/holo/panels'
import { content } from '../content'

// Boot-sequence loader. The percentage follows real milestones (fonts, WebGL, shader
// compile, warm-up frames); the log lines appear as each one completes.

const STEPS: { step: BootStep; weight: number; line: string }[] = [
  { step: 'fonts', weight: 20, line: 'GLYPH TABLES ............ LOADED' },
  { step: 'gl', weight: 15, line: 'RENDER CORE ............. ONLINE' },
  { step: 'compile', weight: 45, line: 'CITY GRID SHADERS ....... COMPILED' },
  { step: 'frames', weight: 20, line: 'FLIGHT SYSTEMS .......... NOMINAL' },
]
const MIN_DURATION = 1600

export function Loader() {
  const boot = useApp((s) => s.boot)
  const entered = useApp((s) => s.entered)
  const [display, setDisplay] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const [gone, setGone] = useState(false)
  const started = useRef(performance.now())

  const target = STEPS.reduce((sum, s) => sum + (boot[s.step] ? s.weight : 0), 0)

  useEffect(() => {
    lockScroll(true)
    window.scrollTo(0, 0)
    fontsReady.then(() => useApp.getState().markBoot('fonts'))
  }, [])

  // ease the counter toward the real target, never faster than MIN_DURATION overall
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const elapsed = performance.now() - started.current
      const cap = Math.min(100, (elapsed / MIN_DURATION) * 100)
      setDisplay((d) => {
        const goal = Math.min(target, cap)
        return d + (goal - d) * 0.12 + (goal > d ? 0.2 : 0)
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])

  const done = target >= 100 && display >= 99.5

  useEffect(() => {
    if (done) setLeaving(true)
  }, [done])

  // separate effect: its timers must not be cleared by the `leaving` re-render
  useEffect(() => {
    if (!leaving) return
    const t1 = setTimeout(() => {
      useApp.getState().enter()
      lockScroll(false)
    }, 450)
    const t2 = setTimeout(() => setGone(true), 1100)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [leaving])

  if (gone || (entered && !leaving)) return null
  const pct = Math.min(100, Math.floor(display))

  return (
    <div
      className={`loader fixed inset-0 z-50 flex items-center justify-center bg-bg px-6 ${leaving ? 'loader--leaving' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`Loading the city, ${pct} percent`}
    >
      <div className="w-full max-w-md font-mono text-[11px] uppercase tracking-[0.2em] text-cyan/80">
        <p className="mb-6 text-white/50">
          {content.name} // portfolio boot v1.0
        </p>
        <ul className="space-y-1.5" aria-hidden>
          <li className="text-white/60">MOUNTING ARCHIVE ........ OK</li>
          {STEPS.map(({ step, line }) =>
            boot[step] ? (
              <li key={step} className="loader__line">
                {line}
              </li>
            ) : null,
          )}
        </ul>
        <div className="mt-10 flex items-end justify-between" aria-hidden>
          <span className="font-display text-7xl font-bold leading-none tracking-tight text-white tabular-nums">
            {String(pct).padStart(3, '0')}
            <span className="text-cyan">%</span>
          </span>
          <span className="pb-2 text-white/40">{done ? 'ENTERING' : 'SYNCING'}</span>
        </div>
        <div className="mt-4 h-px w-full bg-cyan/15" aria-hidden>
          <div className="h-px bg-cyan shadow-[0_0_12px_var(--color-cyan)]" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  )
}
