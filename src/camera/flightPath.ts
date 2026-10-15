import { CatmullRomCurve3, Vector3 } from 'three'

// World layout (meters). The plaza sits at the origin; the project avenue runs along +X.
export const LANDMARKS = {
  plaza: new Vector3(0, 0, 0),
  aboutTower: new Vector3(170, 0, -150),
  avenueStart: new Vector3(240, 0, 0),
  avenueEnd: new Vector3(660, 0, 0),
  skillsTower: new Vector3(780, 0, 0),
  contactMast: new Vector3(820, 0, 220),
} as const

interface Keyframe {
  /** Scroll progress at which the camera reaches this point. */
  p: number
  pos: [number, number, number]
  look: [number, number, number]
}

// Placeholder path (M1). Refined shot-by-shot in M4.
const KEYFRAMES: Keyframe[] = [
  // HERO — straight down on the plaza
  { p: 0.0, pos: [0, 620, 2], look: [0, 0, 0] },
  { p: 0.08, pos: [0, 560, 30], look: [0, 0, 0] },
  // DIVE — pitch forward and drop toward a spoke road
  { p: 0.14, pos: [40, 320, 160], look: [80, 60, -20] },
  { p: 0.2, pos: [110, 110, 60], look: [170, 80, -150] },
  // ABOUT — glide past the bio tower
  { p: 0.27, pos: [120, 85, -60], look: [170, 90, -150] },
  { p: 0.34, pos: [220, 55, -40], look: [320, 45, 0] },
  // PROJECTS — down the avenue
  { p: 0.42, pos: [300, 40, 0], look: [420, 40, 0] },
  { p: 0.5, pos: [440, 40, 0], look: [560, 40, 0] },
  { p: 0.6, pos: [640, 45, 0], look: [780, 80, 0] },
  // SKILLS — climb around the skills tower
  { p: 0.66, pos: [720, 90, -80], look: [780, 110, 0] },
  { p: 0.74, pos: [860, 170, -40], look: [780, 170, 0] },
  // CONTACT — rise to the antenna rooftop
  { p: 0.81, pos: [880, 240, 140], look: [820, 250, 220] },
  { p: 0.88, pos: [760, 290, 280], look: [820, 270, 220] },
  // ORBIT — keep climbing above the clouds to the planet horizon
  { p: 0.95, pos: [700, 1200, 400], look: [1400, 1300, -800] },
  { p: 1.0, pos: [650, 2400, 450], look: [1600, 2400, -1200] },
]

const posCurve = new CatmullRomCurve3(KEYFRAMES.map((k) => new Vector3(...k.pos)), false, 'centripetal')
const lookCurve = new CatmullRomCurve3(KEYFRAMES.map((k) => new Vector3(...k.look)), false, 'centripetal')

/** Map scroll progress to the curve parameter so each keyframe lands at its own `p`. */
function progressToT(progress: number) {
  const n = KEYFRAMES.length
  const p = Math.min(1, Math.max(0, progress))
  for (let i = 0; i < n - 1; i++) {
    const a = KEYFRAMES[i].p
    const b = KEYFRAMES[i + 1].p
    if (p <= b) return (i + (p - a) / (b - a)) / (n - 1)
  }
  return 1
}

export function sampleFlight(progress: number, outPos: Vector3, outLook: Vector3) {
  const t = progressToT(progress)
  posCurve.getPoint(t, outPos)
  lookCurve.getPoint(t, outLook)
}

/** Points along the path, for the debug line. */
export function flightPathPoints(samples = 400) {
  return posCurve.getPoints(samples)
}
