import { Vector3 } from 'three'
import { content } from '../content'

// Single source of truth for where every portfolio landmark sits in the world.
// The camera path (flightPath.ts) and the 3D landmarks both read from here.

export const LANDMARKS = {
  plaza: new Vector3(0, 0, 0),
  aboutTower: new Vector3(170, 0, -150),
  avenueStart: new Vector3(240, 0, 0),
  avenueEnd: new Vector3(660, 0, 0),
  skillsTower: new Vector3(780, 0, 0),
  contactMast: new Vector3(820, 0, 220),
} as const

export interface PanelPose {
  center: Vector3
  /** rotation about Y; the panel faces along (sin θ, 0, cos θ) */
  rotY: number
  width: number
  height: number
}

export const normalOf = (rotY: number) => new Vector3(Math.sin(rotY), 0, Math.cos(rotY))

// ── HERO: name floating flat above the plaza, read from straight above ──
export const HERO_NAME = { y: 70, width: 340, height: 110 }

// ── ABOUT: billboard on the +Z face of the about tower's lower tier (56 m wide) ──
export const ABOUT_PANEL: PanelPose = {
  center: new Vector3(LANDMARKS.aboutTower.x, 96, LANDMARKS.aboutTower.z + 28 + 1),
  rotY: 0,
  width: 48,
  height: 62,
}

// ── PROJECTS: holo billboards alternating sides of the avenue, angled toward the camera ──
export const PROJECT_PANELS: PanelPose[] = content.projects.map((_, i, all) => {
  const n = all.length
  const x = n === 1 ? 450 : 290 + (i * (620 - 290)) / (n - 1)
  const side = i % 2 === 0 ? 1 : -1
  const z = side * 31
  // face back down the avenue and toward its center line
  const rotY = Math.atan2(-0.7, -side)
  return { center: new Vector3(x, 42, z), rotY, width: 30, height: 18 }
})

/** Where the camera sits while it lingers in front of project i (and when zoomed in). */
export function projectCameraPose(i: number, distance: number) {
  const p = PROJECT_PANELS[i]
  const pos = p.center.clone().addScaledVector(normalOf(p.rotY), distance)
  pos.y = 40
  return { pos, look: p.center.clone() }
}

// ── SKILLS: one lit floor per skill group on the skills tower's lower tier (60 m wide, 180 m tall) ──
export const SKILL_FLOORS = content.skills
export const SKILLS_TOWER = {
  center: LANDMARKS.skillsTower,
  half: 30,
  yMin: 52,
  yMax: 172,
}
export const skillLevelY = (i: number) =>
  SKILL_FLOORS.length === 1
    ? (SKILLS_TOWER.yMin + SKILLS_TOWER.yMax) / 2
    : SKILLS_TOWER.yMin + (i * (SKILLS_TOWER.yMax - SKILLS_TOWER.yMin)) / (SKILL_FLOORS.length - 1)

// ── CONTACT: beacons on the contact tower's second-tier roof (40 m wide, top at y=240) ──
export const CONTACT_ROOF = { center: new Vector3(LANDMARKS.contactMast.x, 240, LANDMARKS.contactMast.z), half: 20 }
export const CONTACT_BEACONS = content.contact.links.map((link, i, all) => {
  // spread across the side of the roof that faces the camera's approach (toward +X/−Z)
  const n = all.length
  const a = -Math.PI / 4 + (n === 1 ? 0 : -1.25 + (2.5 * i) / (n - 1))
  const r = 16
  return {
    link,
    base: new Vector3(CONTACT_ROOF.center.x + Math.cos(a) * r, CONTACT_ROOF.center.y, CONTACT_ROOF.center.z + Math.sin(a) * r),
  }
})

// ── STREET HOLOGRAM: a giant jellyfish drifting over the project avenue ──
export const JELLY = {
  /** it floats this far ahead of the camera along the avenue, clamped to [xMin, xMax] */
  lead: 170,
  xMin: 400,
  xMax: 690,
  /** height of the bell and its lateral offset from the flight line (y≈40, z≈0) */
  y: 80,
  z: -14,
  /** slow wander around that point, meters */
  wander: { x: 30, y: 5, z: 8 },
  /** bell radius in meters */
  radius: 22,
}

// ── ORBIT: the cloud deck the camera climbs through, curved over a small stylized planet ──
export const ORBIT = {
  deckY: 760,
  /** planet radius in meters (deliberately small so the horizon visibly curves) */
  radius: 12000,
  /** the planet's center sits below the middle of the city */
  center: new Vector3(800, 760 - 12000, 300),
} as const

/** Above this altitude the city is under the cloud deck and isn't rendered. */
export const aboveClouds = (y: number) => y > ORBIT.deckY + 25
