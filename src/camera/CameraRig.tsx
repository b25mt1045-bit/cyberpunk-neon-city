import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, Vector3 } from 'three'
import { useApp } from '../store'
import { projectCameraPose } from '../world/landmarks'
import { sampleFlight } from './flightPath'
import { telemetry } from './telemetry'

const pos = new Vector3()
const look = new Vector3()
const fwd = new Vector3()
const right = new Vector3()
const up = new Vector3()
const side = new Vector3()
const zoomLook = new Vector3()
const worldUp = new Vector3(0, 1, 0)

const ZOOM_DISTANCE = 30
const easeInOut = (t: number) => t * t * (3 - 2 * t)

/**
 * Drives the camera from scroll progress, then layers on:
 * - zoom into a clicked project billboard (scrolling away or Esc returns),
 * - banking into turns, a slow hover sway, and mouse parallax (all off for reduced motion).
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera)
  const smoothed = useRef(useApp.getState().progress)
  const lookCurrent = useRef<Vector3 | null>(null)
  const zoom = useRef(0)
  const zoomPose = useRef<{ pos: Vector3; look: Vector3 } | null>(null)
  const bank = useRef(0)
  const prevYaw = useRef<number | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && useApp.getState().openProject(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1)
    const { progress, activeProject, reducedMotion } = useApp.getState()
    const t = state.clock.elapsedTime

    smoothed.current = MathUtils.damp(smoothed.current, progress, 6, delta)
    sampleFlight(smoothed.current, pos, look)

    // project zoom: keep the last pose while zooming back out
    if (activeProject !== null) zoomPose.current = projectCameraPose(activeProject, ZOOM_DISTANCE)
    zoom.current = MathUtils.damp(zoom.current, activeProject !== null ? 1 : 0, 3.2, delta)
    const z = easeInOut(zoom.current)
    if (zoomPose.current && z > 0.0005) {
      // frame the billboard clear of the detail panel: left of center on wide screens
      // (panel on the right), higher up on narrow ones (panel is a bottom sheet)
      const zp = zoomPose.current
      zoomLook.copy(zp.look)
      if (state.size.width >= 768) {
        side.subVectors(zp.look, zp.pos).cross(worldUp).normalize()
        zoomLook.addScaledVector(side, 5)
      } else zoomLook.y -= 6
      pos.lerp(zp.pos, z)
      look.lerp(zoomLook, z)
    }

    const motion = reducedMotion ? 0 : 1 - z
    if (motion > 0) {
      // hover sway
      pos.x += Math.sin(t * 0.37) * 0.5 * motion
      pos.y += Math.sin(t * 0.61) * 0.6 * motion
      // mouse parallax: nudge the look target within roughly ±2°
      const k = pos.distanceTo(look) * 0.035 * motion
      right.setFromMatrixColumn(camera.matrixWorld, 0)
      up.setFromMatrixColumn(camera.matrixWorld, 1)
      look.addScaledVector(right, state.pointer.x * k).addScaledVector(up, state.pointer.y * k * 0.6)
    }

    telemetry.speed = MathUtils.damp(telemetry.speed, pos.distanceTo(telemetry.position) / Math.max(delta, 1e-3), 4, delta)
    telemetry.position.copy(pos)

    if (!lookCurrent.current) lookCurrent.current = look.clone()
    lookCurrent.current.lerp(look, 1 - Math.exp(-8 * delta))
    camera.position.copy(pos)
    camera.lookAt(lookCurrent.current)

    // banking: roll against the yaw rate, faded out when looking steeply up/down
    camera.getWorldDirection(fwd)
    const horizontal = Math.hypot(fwd.x, fwd.z)
    let bankTarget = 0
    if (horizontal > 0.3) {
      const yaw = Math.atan2(fwd.x, fwd.z)
      telemetry.heading = (MathUtils.radToDeg(Math.atan2(fwd.x, -fwd.z)) + 360) % 360
      if (prevYaw.current !== null) {
        const dYaw = Math.atan2(Math.sin(yaw - prevYaw.current), Math.cos(yaw - prevYaw.current))
        bankTarget = MathUtils.clamp((dYaw / Math.max(delta, 1e-3)) * 0.3, -0.18, 0.18) * motion
      }
      prevYaw.current = yaw
    } else prevYaw.current = null
    bank.current = MathUtils.damp(bank.current, bankTarget, 2.5, delta)
    camera.rotateZ(bank.current + Math.sin(t * 0.43) * 0.006 * motion)
  })

  return null
}
