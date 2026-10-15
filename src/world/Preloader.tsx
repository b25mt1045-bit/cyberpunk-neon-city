import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useApp } from '../store'

const WARM_FRAMES = 20

/**
 * Reports real loading milestones to the store: WebGL up, every shader compiled,
 * then a few warm-up frames rendered (so the first scroll doesn't hitch).
 */
export function Preloader() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const frames = useRef(-1)

  useEffect(() => {
    const { markBoot } = useApp.getState()
    markBoot('gl')
    let alive = true
    gl.compileAsync(scene, camera)
      .catch(() => undefined) // a failed pre-compile only means compiling on first draw
      .then(() => {
        if (!alive) return
        markBoot('compile')
        frames.current = 0
      })
    return () => {
      alive = false
    }
  }, [gl, scene, camera])

  useFrame(() => {
    if (frames.current < 0 || frames.current > WARM_FRAMES) return
    if (++frames.current === WARM_FRAMES) useApp.getState().markBoot('frames')
  })

  return null
}
