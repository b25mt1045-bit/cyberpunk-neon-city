import { create } from 'zustand'
import type { SectionId } from './sections/chapters'

interface AppState {
  /** Raw scroll progress 0..1. Read via getState() inside useFrame; never select it in a component. */
  progress: number
  section: SectionId
  reducedMotion: boolean
  setProgress: (progress: number, section: SectionId) => void
}

export const useApp = create<AppState>((set) => ({
  progress: 0,
  section: 'hero',
  reducedMotion:
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  setProgress: (progress, section) => set({ progress, section }),
}))
