import { useEffect, useRef } from 'react'
import { useApp } from '../../store'
import { SECTIONS } from '../../sections/chapters'
import { NAV_ITEMS } from '../../scroll/navigation'
import { scrollToProgress } from '../../scroll/useSmoothScroll'
import { telemetry } from '../../camera/telemetry'
import { ChapterCard } from './ChapterCard'
import { Nav } from './Nav'

/** Corner brackets framing the viewport. */
function Frame() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-2 z-20 md:inset-4">
      <span className="hud-corner left-0 top-0 border-l border-t" />
      <span className="hud-corner right-0 top-0 border-r border-t" />
      <span className="hud-corner bottom-0 left-0 border-b border-l" />
      <span className="hud-corner bottom-0 right-0 border-b border-r" />
    </div>
  )
}

function Gfx() {
  const tier = useApp((s) => s.tier)
  return <dd className="uppercase">{tier}</dd>
}

/** Flight data, written straight to the DOM every frame (no React renders). */
function Readouts() {
  const alt = useRef<HTMLSpanElement>(null)
  const pos = useRef<HTMLSpanElement>(null)
  const hdg = useRef<HTMLSpanElement>(null)
  const spd = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let raf = 0
    const loop = () => {
      const p = telemetry.position
      if (alt.current) alt.current.textContent = `${Math.round(p.y).toString().padStart(4, '0')} m`
      if (pos.current) pos.current.textContent = `${Math.round(p.x)} / ${Math.round(p.z)}`
      if (hdg.current) hdg.current.textContent = `${Math.round(telemetry.heading).toString().padStart(3, '0')}°`
      if (spd.current) spd.current.textContent = `${Math.round(telemetry.speed * 3.6)} km/h`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const row = 'flex justify-between gap-6'
  return (
    <dl aria-hidden className="pointer-events-none fixed right-8 top-20 z-20 hidden w-44 space-y-1 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan/70 lg:block">
      <div className={row}><dt className="text-white/35">Alt</dt><dd ref={alt} className="tabular-nums" /></div>
      <div className={row}><dt className="text-white/35">Pos</dt><dd ref={pos} className="tabular-nums" /></div>
      <div className={row}><dt className="text-white/35">Hdg</dt><dd ref={hdg} className="tabular-nums" /></div>
      <div className={row}><dt className="text-white/35">Spd</dt><dd ref={spd} className="tabular-nums" /></div>
      <div className={row}><dt className="text-white/35">Gfx</dt><Gfx /></div>
    </dl>
  )
}

/** Vertical flight-path progress with a tick per section; ticks are jump targets. */
function ProgressRail() {
  const fill = useRef<HTMLDivElement>(null)
  const pct = useRef<HTMLSpanElement>(null)
  const section = useApp((s) => s.section)

  useEffect(
    () =>
      useApp.subscribe(({ progress }) => {
        if (fill.current) fill.current.style.transform = `scaleY(${progress})`
        if (pct.current) pct.current.textContent = `${Math.round(progress * 100).toString().padStart(3, '0')}`
      }),
    [],
  )

  return (
    <div aria-hidden className="pointer-events-auto fixed bottom-24 right-5 top-24 z-20 w-6 md:right-8 lg:top-48">
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-cyan/15" />
      <div ref={fill} className="absolute inset-y-0 left-1/2 w-px origin-top -translate-x-1/2 scale-y-0 bg-cyan shadow-[0_0_8px_var(--color-cyan)]" />
      {SECTIONS.map((s) => {
        const nav = NAV_ITEMS.find((n) => n.id === s.id)
        const active = s.id === section
        return (
          <button
            key={s.id}
            type="button"
            tabIndex={-1}
            disabled={!nav}
            onClick={() => nav && scrollToProgress(nav.target)}
            style={{ top: `${s.start * 100}%` }}
            className="group absolute left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center"
          >
            <span className={`block h-2 w-2 rotate-45 border transition-colors ${active ? 'border-cyan bg-cyan' : 'border-cyan/50 bg-bg'}`} />
            <span className={`absolute right-5 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em] transition-opacity ${active ? 'text-cyan opacity-100' : 'text-white/50 opacity-0 group-hover:opacity-100'}`}>
              {s.label}
            </span>
          </button>
        )
      })}
      <span ref={pct} className="absolute -bottom-7 left-1/2 -translate-x-1/2 font-mono text-[10px] tabular-nums text-cyan/70">000</span>
    </div>
  )
}

export function Hud() {
  const entered = useApp((s) => s.entered)
  return (
    <div className={`hud ${entered ? 'hud--on' : ''}`}>
      {/* soft darkening behind the top bar and the chapter card so thin HUD text stays legible */}
      <div aria-hidden className="hud-scrim hud-scrim--top" />
      <div aria-hidden className="hud-scrim hud-scrim--corner" />
      <Frame />
      <Nav />
      <Readouts />
      <ProgressRail />
      <ChapterCard />
    </div>
  )
}
