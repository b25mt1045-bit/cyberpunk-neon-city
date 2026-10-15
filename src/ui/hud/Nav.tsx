import { useEffect, useState } from 'react'
import { useApp } from '../../store'
import { content } from '../../content'
import { NAV_ITEMS, chapterCode } from '../../scroll/navigation'
import { scrollToProgress } from '../../scroll/useSmoothScroll'

function go(e: React.MouseEvent, target: number) {
  e.preventDefault()
  useApp.getState().openProject(null)
  scrollToProgress(target)
}

/** Sound toggle with a tiny animated level meter. */
function SoundToggle() {
  const on = useApp((s) => s.soundOn)
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => useApp.getState().setSound(!on)}
      className="hud-link flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em]"
    >
      <span aria-hidden className={`sound-meter ${on ? 'sound-meter--on' : ''}`}>
        <span /><span /><span /><span />
      </span>
      <span>Sound<span className="sr-only">{on ? ' on' : ' off'}</span></span>
    </button>
  )
}

/** Top bar: identity on the left, section links on the right (a menu sheet on small screens). */
export function Nav() {
  const section = useApp((s) => s.section)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const links = (onPick?: () => void) =>
    NAV_ITEMS.map((item) => {
      const current = item.id === section || (item.id === 'hero' && section === 'dive')
      return (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            aria-current={current ? 'true' : undefined}
            onClick={(e) => {
              go(e, item.target)
              onPick?.()
            }}
            className="hud-link group flex items-baseline gap-2"
          >
            <span className="text-[10px] text-cyan/50 group-aria-[current]:text-cyan">{chapterCode(item.id)}</span>
            <span>{item.label}</span>
          </a>
        </li>
      )
    })

  return (
    <header className="pointer-events-auto fixed inset-x-0 top-0 z-30 flex items-center justify-between px-4 pt-4 md:px-8 md:pt-6">
      <a href="#hero" onClick={(e) => go(e, 0)} className="hud-link font-display text-sm font-semibold tracking-[0.25em]">
        {content.name}
      </a>

      <div className="flex items-center gap-7">
        <nav aria-label="Sections" className="hidden md:block">
          <ul className="flex gap-7 font-mono text-[11px] uppercase tracking-[0.2em]">{links()}</ul>
        </nav>

        <SoundToggle />

        <button
          type="button"
          className="hud-link font-mono text-[11px] uppercase tracking-[0.2em] md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Sections" className="fixed inset-0 top-14 bg-bg/95 px-6 pt-8 backdrop-blur md:hidden">
          <ul className="space-y-6 font-mono text-base uppercase tracking-[0.2em]">{links(() => setOpen(false))}</ul>
        </nav>
      )}
    </header>
  )
}
