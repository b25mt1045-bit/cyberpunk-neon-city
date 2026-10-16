import { useFrame } from '@react-three/fiber'
import { useApp } from '../store'

/**
 * One clock for all ambient animation (windows, traffic, haze, holograms). With
 * prefers-reduced-motion it runs at a crawl, so the city still feels alive without the
 * constant streaming motion. Read `sceneClock.time` instead of `clock.elapsedTime`.
 */
export const sceneClock = { time: 0 }

const REDUCED_RATE = 0.08

export function SceneClock() {
  // priority -1000: runs before every other frame callback so they all see this frame's time
  useFrame((_, delta) => {
    sceneClock.time += Math.min(delta, 0.1) * (useApp.getState().reducedMotion ? REDUCED_RATE : 1)
  }, -1000)
  return null
}
