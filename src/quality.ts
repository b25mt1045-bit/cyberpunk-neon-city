// Quality tiers. The tier is picked once from the device (and an optional ?quality= override),
// then drei's PerformanceMonitor steps it down when the frame rate drops and back up when it
// recovers (see Scene.tsx). Order of sacrifice, per the performance budget: pixel ratio,
// traffic density, post-processing, then building count. Landmarks are never removed.

export type Tier = 'high' | 'medium' | 'low'
export const TIER_ORDER: Tier[] = ['low', 'medium', 'high']

export interface Settings {
  /** canvas pixel-ratio range (R3F picks the device ratio clamped into it) */
  dpr: [number, number]
  /** fraction of the generic city blocks that are built */
  city: number
  /** light-trail and flying-vehicle density */
  traffic: number
  /** number of drifting haze layers (each is a full-screen noise pass) */
  haze: number
  /** MSAA samples on the post-processing buffer */
  msaa: number
  /** full chain (chromatic aberration, vignette, grain, glitch) or bloom + tone mapping only */
  post: 'full' | 'bloom'
  /** small companion jellyfish */
  companions: number
}

export const SETTINGS: Record<Tier, Settings> = {
  high: { dpr: [1, 1.5], city: 1, traffic: 1, haze: 3, msaa: 4, post: 'full', companions: 2 },
  medium: { dpr: [1, 1.25], city: 0.75, traffic: 0.7, haze: 2, msaa: 2, post: 'full', companions: 1 },
  low: { dpr: [0.75, 1], city: 0.4, traffic: 0.5, haze: 1, msaa: 0, post: 'bloom', companions: 0 },
}

export const isMobile = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(pointer: coarse)').matches &&
  Math.min(window.screen.width, window.screen.height) < 900

/** Highest tier this device may use: phones stay on the 40%-city tier. */
export const ceilingTier = (): Tier => (isMobile() ? 'low' : 'high')

export function overrideTier(): Tier | null {
  if (typeof window === 'undefined') return null
  const q = new URLSearchParams(location.search).get('quality')
  return q === 'high' || q === 'medium' || q === 'low' ? q : null
}

export function initialTier(): Tier {
  const forced = overrideTier()
  if (forced) return forced
  if (isMobile()) return 'low'
  // few cores usually means an integrated GPU too: start one step down, the monitor may raise it
  return (navigator.hardwareConcurrency ?? 8) <= 4 ? 'medium' : 'high'
}

export const stepTier = (tier: Tier, dir: 1 | -1): Tier => {
  const i = TIER_ORDER.indexOf(tier) + dir
  const capped = Math.min(i, TIER_ORDER.indexOf(ceilingTier()))
  return TIER_ORDER[Math.max(0, capped)]
}
