import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, Vector3 } from 'three'
import { useApp } from '../store'
import { sampleFlight } from './flightPath'

const pos = new Vector3()
const look = new Vector3()

/** Drives the camera from scroll progress. Banking, sway and parallax arrive in M4. */
export function CameraRig() {
  const camera = useThree((s) => s.camera)
  const smoothed = useRef(useApp.getState().progress)
  const lookCurrent = useRef(new Vector3())
  const first = useRef(true)

  useFrame((_, delta) => {
    const target = useApp.getState().progress
    // Lenis already smooths the scroll; this extra damping removes jitter from wheel steps.
    smoothed.current = MathUtils.damp(smoothed.current, target, 6, delta)
    sampleFlight(smoothed.current, pos, look)

    if (first.current) {
      lookCurrent.current.copy(look)
      first.current = false
    }
    lookCurrent.current.lerp(look, 1 - Math.exp(-8 * delta))
    camera.position.copy(pos)
    camera.lookAt(lookCurrent.current)
  })

  return null
}
