import { create } from 'zustand'
import type { SectionId } from './sections/chapters'

export type BootStep = 'fonts' | 'gl' | 'compile' | 'frames'

interface AppState {
  /** Raw scroll progress 0..1. Read via getState() inside useFrame; never select it in a component. */
  progress: number
  section: SectionId
  reducedMotion: boolean
  /** Project the camera is zoomed into, or null. */
  activeProject: number | null
  /** Scroll progress when the project was opened; scrolling away from it closes the zoom. */
  activeProjectProgress: number
  /** Loading milestones reported by the scene; the loader turns them into a percentage. */
  boot: Record<BootStep, boolean>
  /** True once the loader has finished and the visitor is in the city. */
  entered: boolean
  /** The pointer is over something clickable in the 3D scene (drives the custom cursor). */
  pointerHint: boolean
  setProgress: (progress: number, section: SectionId) => void
  openProject: (index: number | null) => void
  markBoot: (step: BootStep) => void
  enter: () => void
  setPointerHint: (on: boolean) => void
}

export const useApp = create<AppState>((set, get) => ({
  progress: 0,
  section: 'hero',
  reducedMotion:
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  activeProject: null,
  activeProjectProgress: 0,
  boot: { fonts: false, gl: false, compile: false, frames: false },
  entered: false,
  pointerHint: false,
  setProgress: (progress, section) => {
    const { activeProject, activeProjectProgress } = get()
    const leave = activeProject !== null && Math.abs(progress - activeProjectProgress) > 0.006
    set(leave ? { progress, section, activeProject: null } : { progress, section })
  },
  openProject: (index) => set({ activeProject: index, activeProjectProgress: get().progress }),
  markBoot: (step) => set((s) => (s.boot[step] ? s : { boot: { ...s.boot, [step]: true } })),
  enter: () => set({ entered: true }),
  setPointerHint: (on) => set({ pointerHint: on }),
}))
