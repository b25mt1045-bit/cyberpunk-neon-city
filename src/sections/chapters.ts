// Scroll chapters. `start`/`end` are fractions of total scroll progress (0..1).
// The HTML section heights and the camera keyframes are both derived from this table.
export const SECTIONS = [
  { id: 'hero', label: 'Hero', start: 0.0, end: 0.1 },
  { id: 'dive', label: 'Descent', start: 0.1, end: 0.2 },
  { id: 'about', label: 'About', start: 0.2, end: 0.34 },
  { id: 'projects', label: 'Projects', start: 0.34, end: 0.6 },
  { id: 'skills', label: 'Skills', start: 0.6, end: 0.74 },
  { id: 'contact', label: 'Contact', start: 0.74, end: 0.88 },
  { id: 'orbit', label: 'Orbit', start: 0.88, end: 1.0 },
] as const

export type SectionId = (typeof SECTIONS)[number]['id']

/** Total scroll length in viewport heights (excluding the final screen). */
export const SCROLL_VH = 1100

export function sectionAt(progress: number): SectionId {
  for (const s of SECTIONS) if (progress < s.end) return s.id
  return SECTIONS[SECTIONS.length - 1].id
}
