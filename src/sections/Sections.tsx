import type { ReactNode } from 'react'
import { content } from '../content'
import { SCROLL_VH, SECTIONS, type SectionId } from './chapters'

// Real, semantic HTML for every chapter. Each <section> is sized so its top
// reaches the viewport top exactly when scroll progress hits its `start`.

function Chapter({ id, children }: { id: SectionId; children: ReactNode }) {
  const s = SECTIONS.find((x) => x.id === id)!
  const isLast = id === SECTIONS[SECTIONS.length - 1].id
  const height = (s.end - s.start) * SCROLL_VH + (isLast ? 100 : 0)
  return (
    <section id={id} aria-label={s.label} className="relative" style={{ height: `${height}vh` }}>
      <div className="sticky top-0 flex min-h-screen items-center px-6 md:px-16">
        <div className="pointer-events-auto max-w-xl">{children}</div>
      </div>
    </section>
  )
}

const kicker = 'font-mono text-xs uppercase tracking-[0.3em] text-cyan'

export function Sections() {
  return (
    <main className="pointer-events-none relative z-10">
      <Chapter id="hero">
        <p className={kicker}>{content.title}</p>
        <h1 className="sr-only">{content.name}</h1>
        <p className="mt-4 text-lg text-white/70">{content.tagline}</p>
      </Chapter>

      <Chapter id="dive">
        <p className={kicker}>Descending</p>
      </Chapter>

      <Chapter id="about">
        <h2 className="font-display text-4xl font-semibold">About</h2>
        {content.bio.map((para) => (
          <p key={para} className="mt-4 text-white/75">
            {para}
          </p>
        ))}
      </Chapter>

      <Chapter id="projects">
        <h2 className="font-display text-4xl font-semibold">Projects</h2>
        <ul className="mt-4 space-y-3">
          {content.projects.map((p) => (
            <li key={p.id}>
              <h3 className="font-display text-xl text-magenta">{p.title}</h3>
              <p className="text-sm text-white/70">{p.description}</p>
            </li>
          ))}
        </ul>
      </Chapter>

      <Chapter id="skills">
        <h2 className="font-display text-4xl font-semibold">Skills</h2>
        <dl className="mt-4 space-y-2">
          {content.skills.map((g) => (
            <div key={g.label}>
              <dt className={kicker}>{g.label}</dt>
              <dd className="text-white/75">{g.items.join(' · ')}</dd>
            </div>
          ))}
        </dl>
      </Chapter>

      <Chapter id="contact">
        <h2 className="font-display text-4xl font-semibold">Contact</h2>
        <ul className="mt-4 flex gap-4">
          {content.contact.links.map((l) => (
            <li key={l.label}>
              <a className="font-mono text-teal underline-offset-4 hover:underline" href={l.href}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </Chapter>

      <Chapter id="orbit">
        <p className={kicker}>Signal lost · end of transmission</p>
      </Chapter>
    </main>
  )
}
