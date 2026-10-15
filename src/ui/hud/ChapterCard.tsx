import { useEffect, useState } from 'react'
import { useApp } from '../../store'
import { content } from '../../content'
import { SECTIONS, type SectionId } from '../../sections/chapters'
import { chapterCode, projectHoldProgress } from '../../scroll/navigation'
import { scrollToProgress } from '../../scroll/useSmoothScroll'
import { ScrambleText } from '../ScrambleText'

// Bottom-left card that changes with the chapter. It mirrors <main> visually, so it is
// aria-hidden and its controls are mouse-only; keyboard and screen-reader users get the
// same content and controls in the semantic sections.

const label = (id: SectionId) => SECTIONS.find((s) => s.id === id)!.label

/** Index of the project the camera is currently closest to. */
function useNearestProject() {
  const [index, setIndex] = useState(0)
  useEffect(
    () =>
      useApp.subscribe(({ progress }) => {
        let best = 0
        content.projects.forEach((_, i) => {
          if (Math.abs(projectHoldProgress(i) - progress) < Math.abs(projectHoldProgress(best) - progress)) best = i
        })
        setIndex((cur) => (cur === best ? cur : best))
      }),
    [],
  )
  return index
}

function flyToProject(i: number) {
  useApp.getState().openProject(null)
  scrollToProgress(projectHoldProgress(i), () => useApp.getState().openProject(i))
}

function Body({ section }: { section: SectionId }) {
  const nearest = useNearestProject()
  const muted = 'text-sm leading-relaxed text-white/70'

  switch (section) {
    case 'hero':
      return (
        <>
          <p className={muted}>{content.tagline}</p>
          <p className="hud-cue mt-5 font-mono text-[10px] uppercase tracking-[0.3em] text-cyan">Scroll to descend</p>
        </>
      )
    case 'dive':
      return <p className={muted}>Dropping into the grid. Hold on.</p>
    case 'about':
      return <p className={muted}>{content.bio[0]}</p>
    case 'projects':
      return (
        <ol className="space-y-1.5">
          {content.projects.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => flyToProject(i)}
                className={`hud-link flex w-full items-baseline gap-3 text-left text-sm ${i === nearest ? 'text-white' : 'text-white/45'}`}
              >
                <span className="font-mono text-[10px] text-magenta">{String(i + 1).padStart(2, '0')}</span>
                <span className="truncate">{p.title}</span>
              </button>
            </li>
          ))}
          <li className="pt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">Click a billboard to open it</li>
        </ol>
      )
    case 'skills':
      return (
        <p className={muted}>
          {content.skills.map((g) => g.label).join(' · ')}
          <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">Floors light up as you climb</span>
        </p>
      )
    case 'contact':
      return (
        <ul className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs uppercase tracking-[0.15em]">
          {content.contact.links.map((l) => (
            <li key={l.label}>
              <a tabIndex={-1} href={l.href} target={l.href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer" className="hud-link text-teal">
                {l.label} ↗
              </a>
            </li>
          ))}
        </ul>
      )
    case 'orbit':
      return (
        <button type="button" tabIndex={-1} onClick={() => scrollToProgress(0)} className="hud-link font-mono text-[11px] uppercase tracking-[0.2em] text-cyan">
          ↑ Return to the city
        </button>
      )
  }
}

export function ChapterCard() {
  const section = useApp((s) => s.section)
  const projectOpen = useApp((s) => s.activeProject !== null)
  const title = section === 'hero' ? content.title : label(section)

  return (
    <aside aria-hidden className={`hud-card fixed ${projectOpen ? 'pointer-events-none opacity-0' : 'pointer-events-auto'} bottom-6 left-4 z-20 w-[min(22rem,calc(100vw-2rem))] md:bottom-10 md:left-8 transition-opacity duration-300`}>
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyan">
        {chapterCode(section)} <span className="text-cyan/40">//</span> {label(section)}
      </p>
      <h2 className="mt-2 mb-3 font-display text-3xl font-semibold leading-tight text-white md:text-4xl">
        <ScrambleText key={section} text={title} />
      </h2>
      <div key={section} className="hud-card__body">
        <Body section={section} />
      </div>
    </aside>
  )
}
