import { SECTIONS, type SectionId } from '../sections/chapters'
import { PROJECT_PANELS } from '../world/landmarks'

const range = (id: SectionId) => SECTIONS.find((s) => s.id === id)!
const at = (id: SectionId, f: number) => {
  const s = range(id)
  return s.start + (s.end - s.start) * f
}

/** Scroll progress where the camera holds in front of project i (matches flightPath's keyframes). */
export function projectHoldProgress(i: number) {
  const { start, end } = range('projects')
  const slot = (end - start) / PROJECT_PANELS.length
  return start + i * slot + slot * 0.7
}

/** Sections reachable from the nav, with the scroll position that frames each landmark best. */
export const NAV_ITEMS: { id: SectionId; label: string; target: number }[] = [
  { id: 'hero', label: 'Home', target: 0 },
  { id: 'about', label: 'About', target: at('about', 0.55) },
  { id: 'projects', label: 'Projects', target: projectHoldProgress(0) },
  { id: 'skills', label: 'Skills', target: at('skills', 0.65) },
  { id: 'contact', label: 'Contact', target: at('contact', 0.85) },
]

/** Two-digit chapter code shown in the HUD, e.g. "03". */
export const chapterCode = (id: SectionId) => String(SECTIONS.findIndex((s) => s.id === id) + 1).padStart(2, '0')
