import { Vector3 } from 'three'

/** Live camera readings written by CameraRig every frame and read by the HUD (no React updates). */
export const telemetry = {
  position: new Vector3(),
  /** compass heading in degrees, 0 = −Z (north) */
  heading: 0,
  /** meters per second */
  speed: 0,
}
