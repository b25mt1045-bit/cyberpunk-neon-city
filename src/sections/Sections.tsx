import type { ReactNode } from 'react'
import { content } from '../content'
import { useApp } from '../store'
import { projectHoldProgress } from '../scroll/navigation'
import { scrollToProgress } from '../scroll/useSmoothScroll'
import { SCROLL_VH, SECTIONS, type SectionId } from './chapters'

// The real document: every piece of content as semantic HTML, for screen readers, SEO and
// keyboard users. Each <section> is sized so its top reaches the viewport exactly when scroll
// progress hits its `start`, which is what gives the page its scroll length.
// Visually the HUD and the 3D scene present this content, so the text is screen-reader-only
// until keyboard focus lands inside it; then it shows as a readable card.

function Chapter({ id, children }: { id: SectionId; children: ReactNode }) {
  const s = SECTIONS.find((x) => x.id === id)!
  const isLast = id === SECTIONS[SECTIONS.length - 1].id
  const height = (s.end - s.start) * SCROLL_VH + (isLast ? 100 : 0)
  return (
    <section id={id} aria-label={s.label} className="relative" style={{ height: `${height}vh` }}>
      <div className="sticky top-0 flex min-h-screen items-center px-4 md:px-8">
        <div className="a11y-card pointer-events-auto sr-only focus-within:not-sr-only">{children}</div>
      </div>
    </section>
  )
}

function openProject(i: number) {
  scrollToProgress(projectHoldProgress(i), () => useApp.getState().openProject(i))
}

export function Sections() {
  return (
    <main className="pointer-events-none relative z-10">
      <Chapter id="hero">
        <h1>{content.name}</h1>
        <p>{content.title}</p>
        <p>{content.tagline}</p>
      </Chapter>

      <Chapter id="dive">
        <p>Descending into the city.</p>
      </Chapter>

      <Chapter id="about">
        <h2>About</h2>
        {content.bio.map((para) => (
          <p key={para}>{para}</p>
        ))}
        <p>Based in {content.location}.</p>
      </Chapter>

      <Chapter id="projects">
        <h2>Projects</h2>
        <ul>
          {content.projects.map((p, i) => (
            <li key={p.id}>
              <h3>{p.title}</h3>
              <p>{p.description}</p>
              <p>Tech: {p.tech.join(', ')}</p>
              {p.links.length > 0 && (
                <ul>
                  {p.links.map((l) => (
                    <li key={l.href}>
                      <a href={l.href} target="_blank" rel="noreferrer">
                        {l.label}: {p.title}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <button type="button" onClick={() => openProject(i)}>
                Fly to {p.title}
              </button>
            </li>
          ))}
        </ul>
      </Chapter>

      <Chapter id="skills">
        <h2>Skills</h2>
        <dl>
          {content.skills.map((g) => (
            <div key={g.label}>
              <dt>{g.label}</dt>
              <dd>{g.items.join(', ')}</dd>
            </div>
          ))}
        </dl>
      </Chapter>

      <Chapter id="contact">
        <h2>Contact</h2>
        <p>
          Email: <a href={`mailto:${content.contact.email}`}>{content.contact.email}</a>
        </p>
        <ul>
          {content.contact.links.map((l) => (
            <li key={l.label}>
              <a href={l.href} target={l.href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </Chapter>

      <Chapter id="orbit">
        <p>End of the flight.</p>
        <a href="#hero" onClick={(e) => (e.preventDefault(), scrollToProgress(0))}>
          Back to the top
        </a>
      </Chapter>
    </main>
  )
}
