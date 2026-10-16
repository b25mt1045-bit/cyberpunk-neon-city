import { flightPathPoints } from '../camera/flightPath'
import { LANDMARKS } from './landmarks'

// Deterministic city plan. Every building is a box; hero megatowers are stacks of boxes.
// All of it renders as ONE InstancedMesh (see City.tsx).

export interface Building {
  x: number
  z: number
  /** footprint width (x), height (y), depth (z) in meters */
  w: number
  h: number
  d: number
  /** base elevation (for stacked tiers) */
  y0: number
  seed: number
  /** edge-glow color index into ACCENTS, or -1 for no edge glow */
  accent: number
}

export const PLAZA_RADIUS = 110
export const SPOKE_COUNT = 8
export const SPOKE_HALF_WIDTH = 13
export const AVENUE = { x0: 200, x1: 720, halfWidth: 40 }
const CELL = 42
const EXTENT = { x0: -900, x1: 1500, z0: -1000, z1: 1000 }

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Distance from (x,z) to the nearest spoke road center line (outside the plaza). */
export function spokeDistance(x: number, z: number) {
  const r = Math.hypot(x, z)
  if (r < PLAZA_RADIUS) return 0
  const step = (Math.PI * 2) / SPOKE_COUNT
  const a = Math.atan2(z, x)
  const nearest = Math.round(a / step) * step
  return Math.abs(Math.sin(a - nearest)) * r
}

const cache = new Map<number, Building[]>()

/** Memoized city plan, shared by every system that decorates the buildings. */
export function getCity(density = 1): Building[] {
  let city = cache.get(density)
  if (!city) cache.set(density, (city = generateCity(density)))
  return city
}

export function generateCity(density = 1): Building[] {
  const rand = mulberry32(20261015)
  const path = flightPathPoints(800)
  const out: Building[] = []

  /** True when a box at (x,z) of the given half-size and height would intersect the camera corridor. */
  const blocksCamera = (x: number, z: number, half: number, h: number) =>
    path.some((p) => p.y < h + 25 && Math.hypot(p.x - x, p.z - z) < half * 1.42 + 22)

  const reserved = [LANDMARKS.aboutTower, LANDMARKS.skillsTower, LANDMARKS.contactMast]

  // ── generic city on a jittered grid ─────────────────────────
  for (let gx = EXTENT.x0; gx < EXTENT.x1; gx += CELL) {
    for (let gz = EXTENT.z0; gz < EXTENT.z1; gz += CELL) {
      if (rand() > density) continue
      const w = 22 + rand() * 14
      const d = 22 + rand() * 14
      const x = gx + CELL / 2 + (rand() - 0.5) * (CELL - w - 6)
      const z = gz + CELL / 2 + (rand() - 0.5) * (CELL - d - 6)
      const half = Math.max(w, d) / 2

      const r = Math.hypot(x, z)
      if (r < PLAZA_RADIUS + half + 10) continue
      if (spokeDistance(x, z) < SPOKE_HALF_WIDTH + half) continue
      if (x > AVENUE.x0 && x < AVENUE.x1 && Math.abs(z) < AVENUE.halfWidth + half) continue
      if (reserved.some((l) => Math.hypot(l.x - x, l.z - z) < 60)) continue

      // Taller toward the core and along the avenue canyon; occasional spikes.
      const core = 70 + 190 * Math.exp(-r / 520)
      const canyon = x > AVENUE.x0 - 40 && x < AVENUE.x1 + 80 && Math.abs(z) < 140 ? 70 : 0
      let h = (core + canyon) * (0.3 + 0.7 * rand() ** 0.8)
      if (rand() < 0.05) h *= 1.7
      h = Math.max(14, h)

      if (blocksCamera(x, z, half, h)) continue

      out.push({
        x, z, w, h, d, y0: 0,
        seed: rand(),
        accent: rand() < 0.45 ? Math.floor(rand() * 4) : -1,
      })
    }
  }

  // ── hand-placed megatowers (stacked tiers) ──────────────────
  const stack = (x: number, z: number, tiers: [number, number][], accent: number) => {
    let y0 = 0
    for (const [size, h] of tiers) {
      out.push({ x, z, w: size, d: size, h, y0, seed: rand(), accent })
      y0 += h
    }
  }

  stack(LANDMARKS.aboutTower.x, LANDMARKS.aboutTower.z, [[56, 150], [44, 90], [30, 50]], 1)
  stack(LANDMARKS.skillsTower.x, LANDMARKS.skillsTower.z, [[60, 180], [46, 100], [34, 40]], 0)
  stack(LANDMARKS.contactMast.x, LANDMARKS.contactMast.z, [[54, 160], [40, 80], [4, 70]], 3)

  // A ring of megatowers around the plaza (skipped where they'd block the flight).
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) * ((Math.PI * 2) / SPOKE_COUNT)
    const rr = 190 + rand() * 60
    const x = Math.cos(a) * rr
    const z = Math.sin(a) * rr
    const total = 300 + rand() * 140
    if (blocksCamera(x, z, 26, total)) continue
    stack(x, z, [[52, total * 0.55], [40, total * 0.3], [28, total * 0.15]], Math.floor(rand() * 4))
  }

  return out
}
