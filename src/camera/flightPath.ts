import { CatmullRomCurve3, Vector3 } from 'three'
import { SECTIONS, type SectionId } from '../sections/chapters'
import { ABOUT_PANEL, CONTACT_ROOF, PROJECT_PANELS, SKILLS_TOWER, projectCameraPose } from '../world/landmarks'

interface Keyframe {
  /** Scroll progress at which the camera reaches this point. */
  p: number
  pos: Vector3
  look: Vector3
}

const v = (x: number, y: number, z: number) => new Vector3(x, y, z)
const range = (id: SectionId) => SECTIONS.find((s) => s.id === id)!
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function projectKeyframes(): Keyframe[] {
  const { start, end } = range('projects')
  const n = PROJECT_PANELS.length
  const slot = (end - start) / n
  return PROJECT_PANELS.flatMap((panel, i) => {
    const s0 = start + i * slot
    const approach = projectCameraPose(i, 52)
    const hold = projectCameraPose(i, 36)
    return [
      { p: s0 + slot * 0.2, pos: approach.pos, look: panel.center.clone() },
      // lingering here (camera barely moves for ~half the slot) is the "hold"
      { p: s0 + slot * 0.7, pos: hold.pos, look: panel.center.clone() },
    ]
  })
}

function buildKeyframes(): Keyframe[] {
  const about = range('about')
  const skills = range('skills')
  const contact = range('contact')
  const tower = SKILLS_TOWER.center
  const roof = CONTACT_ROOF.center
  const aboutFace = ABOUT_PANEL.center

  return [
    // HERO — straight down on the plaza and the floating name
    // (the small +Z offset fixes which way is 'up' on screen; it must dwarf the sway)
    { p: 0.0, pos: v(0, 620, 45), look: v(0, 0, 0) },
    { p: 0.08, pos: v(0, 560, 70), look: v(0, 0, 0) },
    // DIVE — pitch forward and drop between the towers
    { p: 0.14, pos: v(40, 320, 160), look: v(80, 60, -20) },
    { p: 0.2, pos: v(95, 120, 40), look: aboutFace.clone() },
    // ABOUT — come around to face the bio billboard and glide past it
    { p: lerp(about.start, about.end, 0.35), pos: v(aboutFace.x - 40, aboutFace.y, aboutFace.z + 72), look: aboutFace.clone() },
    { p: lerp(about.start, about.end, 0.7), pos: v(aboutFace.x + 4, aboutFace.y - 4, aboutFace.z + 62), look: aboutFace.clone() },
    { p: about.end, pos: v(250, 52, -22), look: v(330, 44, 0) },
    // PROJECTS — weave down the avenue, pausing at each billboard
    ...projectKeyframes(),
    // SKILLS — climb around the skills tower as its floors light up
    { p: lerp(skills.start, skills.end, 0.1), pos: v(tower.x - 100, 70, -60), look: v(tower.x, 80, tower.z - 31) },
    { p: lerp(skills.start, skills.end, 0.45), pos: v(tower.x - 40, 118, -95), look: v(tower.x, 122, tower.z - 31) },
    { p: lerp(skills.start, skills.end, 0.8), pos: v(tower.x + 50, 158, -90), look: v(tower.x + 15, 160, tower.z - 20) },
    { p: skills.end, pos: v(tower.x + 90, 185, -40), look: v(tower.x + 31, 175, tower.z) },
    // CONTACT — rise over the roof edge to the beacons around the mast
    { p: lerp(contact.start, contact.end, 0.35), pos: v(roof.x + 80, 215, roof.z - 100), look: v(roof.x, 235, roof.z) },
    { p: lerp(contact.start, contact.end, 0.75), pos: v(roof.x + 50, 262, roof.z - 45), look: v(roof.x, 250, roof.z) },
    { p: contact.end, pos: v(roof.x + 42, 272, roof.z - 36), look: v(roof.x, 252, roof.z) },
    // ORBIT — keep climbing above the clouds to the planet horizon (built in M6)
    { p: 0.95, pos: v(780, 1200, 300), look: v(1400, 1300, -800) },
    { p: 1.0, pos: v(700, 2400, 400), look: v(1600, 2400, -1200) },
  ]
}

const KEYFRAMES = buildKeyframes()

const posCurve = new CatmullRomCurve3(KEYFRAMES.map((k) => k.pos), false, 'centripetal')
const lookCurve = new CatmullRomCurve3(KEYFRAMES.map((k) => k.look), false, 'centripetal')

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

/** Points along the path, for corridor clearing. */
export function flightPathPoints(samples = 400) {
  return posCurve.getPoints(samples)
}
