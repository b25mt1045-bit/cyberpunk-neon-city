// Single source of truth for colors used in both 3D and the HTML overlay.
export const palette = {
  bg: '#05060f',
  cyan: '#00f0ff',
  teal: '#00ffc8',
  magenta: '#ff2bd6',
  purple: '#8a2be2',
  orange: '#ff6b1a',
  red: '#ff1e3c',
} as const

export type PaletteKey = keyof typeof palette
