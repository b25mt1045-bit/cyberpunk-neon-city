import { useEffect, useRef } from 'react'
import { useApp } from '../store'
import { content } from '../content'
import { projectHoldProgress } from '../scroll/navigation'
import { scrollToProgress } from '../scroll/useSmoothScroll'
import { ScrambleText } from './ScrambleText'

/** Detail panel that opens beside the zoomed-in billboard. Esc, the close button, or scrolling away closes it. */
export function ProjectPanel() {
  const index = useApp((s) => s.activeProject)
  const closeRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (index === null) {
      returnFocus.current?.focus?.()
      returnFocus.current = null
      return
    }
    if (!returnFocus.current) returnFocus.current = document.activeElement as HTMLElement
    // wait for the slide-in so focus doesn't jump the page
    const t = setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 50)
    return () => clearTimeout(t)
  }, [index])

  if (index === null) return null
  const p = content.projects[index]
  const n = content.projects.length
  const step = (d: number) => {
    const next = (index + d + n) % n
    useApp.getState().openProject(null)
    scrollToProgress(projectHoldProgress(next), () => useApp.getState().openProject(next))
  }

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="project-panel-title"
      className="project-panel pointer-events-auto fixed inset-x-3 bottom-3 z-40 max-h-[70vh] overflow-y-auto border border-magenta/40 bg-bg/85 p-6 backdrop-blur-md md:inset-x-auto md:bottom-auto md:right-8 md:top-1/2 md:max-h-[80vh] md:w-[26rem] md:-translate-y-1/2"
    >
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.3em]">
        <span className="text-magenta">PRJ-{String(index + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>
        <button ref={closeRef} type="button" onClick={() => useApp.getState().openProject(null)} className="hud-link text-white/60">
          Close [Esc]
        </button>
      </div>

      <h2 id="project-panel-title" className="mt-4 font-display text-3xl font-semibold leading-tight text-white">
        <ScrambleText key={p.id} text={p.title} />
      </h2>

      {p.image && <img src={p.image} alt="" className="mt-4 aspect-video w-full border border-white/10 object-cover" />}

      <p className="mt-4 text-sm leading-relaxed text-white/75">{p.description}</p>

      <ul className="mt-5 flex flex-wrap gap-2" aria-label="Tech used">
        {p.tech.map((t) => (
          <li key={t} className="border border-teal/50 px-2 py-0.5 font-mono text-[11px] text-teal">
            {t}
          </li>
        ))}
      </ul>

      <ul className="mt-6 flex flex-wrap gap-3">
        {p.links.map((l) => (
          <li key={l.href}>
            <a href={l.href} target="_blank" rel="noreferrer" className="hud-button">
              {l.label} ↗
            </a>
          </li>
        ))}
      </ul>

      {n > 1 && (
        <div className="mt-8 flex justify-between border-t border-white/10 pt-4 font-mono text-[11px] uppercase tracking-[0.2em]">
          <button type="button" onClick={() => step(-1)} className="hud-link text-white/60">← Prev</button>
          <button type="button" onClick={() => step(1)} className="hud-link text-white/60">Next →</button>
        </div>
      )}
    </section>
  )
}
