/**
 * Live camera readings written by CameraRig every frame and read by the HUD and the audio
 * (no React updates). Plain numbers on purpose: this module is imported by UI code that loads
 * before the three.js chunk, so it must not import three.
 */
export const telemetry = {
  position: { x: 0, y: 0, z: 0 },
  /** compass heading in degrees, 0 = −Z (north) */
  heading: 0,
  /** meters per second */
  speed: 0,
}
