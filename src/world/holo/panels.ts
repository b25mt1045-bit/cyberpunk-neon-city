import { palette } from '../../theme'
import type { ContactLink, Project } from '../../content'

// Canvas artwork for every hologram panel. Everything is drawn at runtime from content.ts,
// so there are no image assets to license or load.

export type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void

export const display = (px: number, weight = 700) => `${weight} ${px}px "Chakra Petch", sans-serif`
export const mono = (px: number, weight = 400) => `${weight} ${px}px "JetBrains Mono", monospace`

/** Resolves when the web fonts used on canvases are ready (or after a timeout). */
export const fontsReady: Promise<unknown> = Promise.race([
  Promise.all([
    document.fonts.load(display(64, 700)),
    document.fonts.load(display(64, 600)),
    document.fonts.load(mono(32, 400)),
    document.fonts.load(mono(32, 600)),
  ]),
  new Promise((r) => setTimeout(r, 4000)),
])

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

/** Thin frame with corner brackets, the HUD signature used across the site. */
function frame(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, inset = 12) {
  const c = Math.min(w, h) * 0.08
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.35
  ctx.lineWidth = 2
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2)
  ctx.globalAlpha = 1
  ctx.lineWidth = 6
  ctx.beginPath()
  for (const [x, y, dx, dy] of [
    [inset, inset, 1, 1],
    [w - inset, inset, -1, 1],
    [inset, h - inset, 1, -1],
    [w - inset, h - inset, -1, -1],
  ]) {
    ctx.moveTo(x, y + dy * c)
    ctx.lineTo(x, y)
    ctx.lineTo(x + dx * c, y)
  }
  ctx.stroke()
}

function tint(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, alpha: number) {
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.fillRect(0, 0, w, h)
  ctx.globalAlpha = 1
}

/** Text with a faint chromatic split, for headline weight. */
function splitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, main: string) {
  ctx.globalAlpha = 0.55
  ctx.fillStyle = palette.magenta
  ctx.fillText(text, x - 4, y + 2)
  ctx.globalAlpha = 1
  ctx.fillStyle = main
  ctx.fillText(text, x, y)
}

export const drawHeroName =
  (name: string, title: string): Draw =>
  (ctx, w, h) => {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    let size = h * 0.5
    ctx.font = display(size)
    while (ctx.measureText(name).width > w * 0.92 && size > 20) ctx.font = display((size -= 4))
    splitText(ctx, name, w / 2, h * 0.42, palette.cyan)
    ctx.font = mono(h * 0.09, 600)
    ctx.fillStyle = palette.teal
    ctx.fillText(title.toUpperCase().split('').join(' '), w / 2, h * 0.82)
    // rule lines either side of the title
    ctx.fillStyle = palette.cyan
    ctx.fillRect(w * 0.05, h * 0.82, w * 0.18, 3)
    ctx.fillRect(w * 0.77, h * 0.82, w * 0.18, 3)
  }

export const drawAbout =
  (name: string, bio: string[], location: string): Draw =>
  (ctx, w, h) => {
    tint(ctx, w, h, palette.purple, 0.12)
    frame(ctx, w, h, palette.magenta)
    const pad = w * 0.08
    ctx.textBaseline = 'top'
    ctx.font = mono(w * 0.032, 600)
    ctx.fillStyle = palette.magenta
    ctx.fillText('// 01  ABOUT', pad, pad)
    ctx.font = display(w * 0.085)
    splitText(ctx, name, pad, pad + w * 0.06, '#ffffff')
    let y = pad + w * 0.2
    ctx.font = display(w * 0.042, 400)
    ctx.fillStyle = '#e8f6ff'
    for (const para of bio) {
      for (const line of wrap(ctx, para, w - pad * 2)) {
        ctx.fillText(line, pad, y)
        y += w * 0.058
      }
      y += w * 0.03
    }
    ctx.font = mono(w * 0.03)
    ctx.fillStyle = palette.cyan
    ctx.fillText(`◉ ${location.toUpperCase()}`, pad, h - pad - w * 0.03)
  }

export const drawProject =
  (p: Project, index: number): Draw =>
  (ctx, w, h) => {
    const accent = index % 2 === 0 ? palette.cyan : palette.magenta
    tint(ctx, w, h, accent, 0.07)
    frame(ctx, w, h, accent)
    const pad = w * 0.06
    ctx.textBaseline = 'top'
    ctx.font = mono(w * 0.026, 600)
    ctx.fillStyle = accent
    ctx.fillText(`PRJ-${String(index + 1).padStart(2, '0')}`, pad, pad)
    ctx.textAlign = 'right'
    ctx.fillText('▸ CLICK TO OPEN', w - pad, pad)
    ctx.textAlign = 'left'

    ctx.font = display(w * 0.072)
    splitText(ctx, p.title, pad, pad + h * 0.12, '#ffffff')

    ctx.font = display(w * 0.034, 400)
    ctx.fillStyle = '#d8ecff'
    let y = pad + h * 0.38
    for (const line of wrap(ctx, p.description, w - pad * 2).slice(0, 3)) {
      ctx.fillText(line, pad, y)
      y += w * 0.046
    }

    // tech chips
    ctx.font = mono(w * 0.024, 600)
    let x = pad
    const chipY = h - pad - w * 0.05
    for (const t of p.tech) {
      const tw = ctx.measureText(t).width + w * 0.03
      ctx.strokeStyle = palette.teal
      ctx.lineWidth = 2
      ctx.strokeRect(x, chipY, tw, w * 0.045)
      ctx.fillStyle = palette.teal
      ctx.fillText(t, x + w * 0.015, chipY + w * 0.01)
      x += tw + w * 0.015
    }
  }

/** One tall strip covering the tower face; label i sits at fraction `levelFrac(i)` from the bottom. */
export const drawSkillsStrip =
  (items: { group: string; item: string }[], levelFrac: (i: number) => number): Draw =>
  (ctx, w, h) => {
    ctx.textBaseline = 'middle'
    items.forEach(({ group, item }, i) => {
      const y = h * (1 - levelFrac(i))
      ctx.font = mono(w * 0.04, 600)
      ctx.fillStyle = palette.teal
      ctx.fillText(group.toUpperCase(), w * 0.04, y - w * 0.055)
      ctx.font = display(w * 0.085)
      splitText(ctx, item.toUpperCase(), w * 0.04, y + w * 0.01, '#ffffff')
      ctx.fillStyle = palette.cyan
      ctx.fillRect(w * 0.04, y + w * 0.065, w * 0.92, 3)
    })
  }

export const drawContactLabel =
  (link: ContactLink): Draw =>
  (ctx, w, h) => {
    tint(ctx, w, h, palette.teal, 0.08)
    frame(ctx, w, h, palette.teal, 8)
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    ctx.font = display(h * 0.42)
    splitText(ctx, link.code, w / 2, h * 0.4, palette.teal)
    ctx.font = mono(h * 0.14, 600)
    ctx.fillStyle = '#e8f6ff'
    ctx.fillText(link.label.toUpperCase(), w / 2, h * 0.78)
  }
