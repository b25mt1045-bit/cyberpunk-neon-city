import { create } from 'zustand'
import type { SectionId } from './sections/chapters'

interface AppState {
  /** Raw scroll progress 0..1. Read via getState() inside useFrame; never select it in a component. */
  progress: number
  section: SectionId
  reducedMotion: boolean
  /** Project the camera is zoomed into, or null. */
  activeProject: number | null
  /** Scroll progress when the project was opened; scrolling away from it closes the zoom. */
  activeProjectProgress: number
  setProgress: (progress: number, section: SectionId) => void
  openProject: (index: number | null) => void
}

export const useApp = create<AppState>((set, get) => ({
  progress: 0,
  section: 'hero',
  reducedMotion:
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  activeProject: null,
  activeProjectProgress: 0,
  setProgress: (progress, section) => {
    const { activeProject, activeProjectProgress } = get()
    const leave = activeProject !== null && Math.abs(progress - activeProjectProgress) > 0.006
    set(leave ? { progress, section, activeProject: null } : { progress, section })
  },
  openProject: (index) => set({ activeProject: index, activeProjectProgress: get().progress }),
}))
