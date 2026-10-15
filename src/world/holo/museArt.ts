import { palette } from '../../theme'
import type { Draw } from './panels'

// Canvas artwork for the giant street hologram: an original figure (a kneeling woman in
// profile, leaning over the street and pointing down at it). She is drawn in a shared
// 1000×1000 "figure space", facing left, and split into depth layers so the camera gets
// parallax between them. Each layer covers its own rectangle of figure space.

export type MuseLayer = 'aura' | 'body' | 'head' | 'arm'

/** [x0, y0, x1, y1] in figure space; panels are sized and placed from these. */
export const MUSE_RECTS: Record<MuseLayer, [number, number, number, number]> = {
  aura: [0, 80, 1000, 1000],
  body: [300, 330, 800, 960],
  head: [300, 100, 640, 440],
  arm: [60, 400, 560, 700],
}

type Pt = [number, number]
/** x, y, half-width */
type Joint = [number, number, number]

const WHITE = '#fff4fd'
const SKIN = '#ffc4ef'
const HAIR = '#a8f4ff'

/** Tapered capsule through a chain of joints (outline built from per-joint offsets). */
function limb(joints: Joint[]): Path2D {
  const left: Pt[] = []
  const right: Pt[] = []
  joints.forEach(([x, y, r], i) => {
    const [px, py] = joints[Math.max(0, i - 1)]
    const [nx, ny] = joints[Math.min(joints.length - 1, i + 1)]
    let dx = nx - px
    let dy = ny - py
    const len = Math.hypot(dx, dy) || 1
    dx /= len
    dy /= len
    left.push([x - dy * r, y + dx * r])
    right.push([x + dy * r, y - dx * r])
  })
  const p = new Path2D()
  const smooth = (pts: Pt[], first: boolean) => {
    if (first) p.moveTo(pts[0][0], pts[0][1])
    else p.lineTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2
      const my = (pts[i][1] + pts[i + 1][1]) / 2
      p.quadraticCurveTo(pts[i][0], pts[i][1], mx, my)
    }
    const last = pts[pts.length - 1]
    p.lineTo(last[0], last[1])
  }
  smooth(left, true)
  // rounded cap at the end
  const [ex, ey, er] = joints[joints.length - 1]
  const [qx, qy] = joints[joints.length - 2]
  const ea = Math.atan2(ey - qy, ex - qx)
  p.arc(ex, ey, er, ea + Math.PI / 2, ea - Math.PI / 2, true)
  smooth(right.reverse(), false)
  const [sx, sy, sr] = joints[0]
  const [tx, ty] = joints[1]
  const sa = Math.atan2(sy - ty, sx - tx)
  p.arc(sx, sy, sr, sa + Math.PI / 2, sa - Math.PI / 2, true)
  p.closePath()
  return p
}

function path(build: (p: Path2D) => void) {
  const p = new Path2D()
  build(p)
  p.closePath()
  return p
}

/** Vertical gradient magenta (bottom) → violet → blue (top), the hologram's body light. */
function bodyGradient(ctx: CanvasRenderingContext2D, top: number, bottom: number, alpha: number) {
  const g = ctx.createLinearGradient(0, top, 0, bottom)
  g.addColorStop(0, `rgba(120, 140, 255, ${alpha})`)
  g.addColorStop(0.45, `rgba(170, 70, 255, ${alpha})`)
  g.addColorStop(1, `rgba(255, 43, 214, ${alpha * 1.15})`)
  return g
}

/** Fill a part, then trace its rim with a glow so overlapping parts stay readable. */
function part(ctx: CanvasRenderingContext2D, p: Path2D, fill: string | CanvasGradient, rim: string, rimWidth = 3) {
  ctx.fillStyle = fill
  ctx.fill(p)
  ctx.save()
  ctx.clip(p)
  // inner edge light: a thick blurred stroke clipped to the inside
  ctx.shadowColor = rim
  ctx.shadowBlur = 18
  ctx.strokeStyle = rim
  ctx.globalAlpha = 0.5
  ctx.lineWidth = rimWidth * 5
  ctx.stroke(p)
  ctx.restore()
  ctx.save()
  ctx.shadowColor = rim
  ctx.shadowBlur = 10
  ctx.strokeStyle = rim
  ctx.lineWidth = rimWidth
  ctx.stroke(p)
  ctx.restore()
}

function seam(ctx: CanvasRenderingContext2D, pts: Pt[], color: string, width = 2, alpha = 0.9) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 8
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2
    const my = (pts[i][1] + pts[i + 1][1]) / 2
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my)
  }
  const last = pts[pts.length - 1]
  ctx.lineTo(last[0], last[1])
  ctx.stroke()
  ctx.restore()
}

// ── parts ────────────────────────────────────────────────────

function drawBody(ctx: CanvasRenderingContext2D) {
  const fill = bodyGradient(ctx, 380, 940, 0.34)

  // far arm, braced on the ground in front of the knees (dim, it's behind everything)
  ctx.globalAlpha = 0.55
  part(ctx, limb([[575, 440, 34], [560, 600, 27], [500, 760, 22], [470, 905, 20]]), fill, palette.purple)
  part(ctx, limb([[470, 900, 22], [430, 920, 18], [395, 925, 12]]), fill, palette.purple)
  ctx.globalAlpha = 1

  // shins folded under, resting along the ground
  part(ctx, limb([[400, 905, 40], [520, 918, 36], [640, 922, 30], [720, 916, 24]]), fill, palette.magenta)
  // foot
  part(ctx, limb([[700, 915, 22], [760, 905, 16], [790, 895, 10]]), fill, palette.magenta)

  // torso: chest leaning forward over the knees, back curving down to the hips
  const torso = path((p) => {
    p.moveTo(468, 392) // front of the neck base
    p.bezierCurveTo(440, 405, 425, 430, 424, 458) // collarbone → bust
    p.bezierCurveTo(422, 488, 440, 505, 462, 512) // under the bust
    p.bezierCurveTo(480, 545, 505, 590, 512, 625) // ribs → waist
    p.bezierCurveTo(525, 690, 555, 740, 600, 770) // belly → lap
    p.lineTo(690, 770)
    p.bezierCurveTo(715, 715, 690, 655, 655, 610) // hip / lower back
    p.bezierCurveTo(625, 560, 630, 480, 600, 432) // back
    p.bezierCurveTo(575, 400, 540, 388, 515, 384) // shoulder line → nape
  })
  // thigh, from hip forward to the knee on the ground
  const thigh = limb([[650, 735, 62], [560, 790, 58], [470, 850, 50], [405, 895, 44]])
  part(ctx, thigh, fill, palette.magenta)
  part(ctx, torso, fill, palette.magenta)

  // neck
  part(ctx, path((p) => {
    p.moveTo(448, 345)
    p.lineTo(500, 330)
    p.bezierCurveTo(505, 355, 515, 375, 525, 392)
    p.lineTo(462, 405)
    p.bezierCurveTo(458, 385, 452, 365, 448, 345)
  }), bodyGradient(ctx, 320, 410, 0.4), SKIN, 2)

  // suit details: collar ring, seams, a spine light
  seam(ctx, [[462, 400], [495, 404], [526, 392]], palette.cyan, 4)
  seam(ctx, [[520, 400], [600, 440], [630, 520], [650, 610], [685, 700]], palette.cyan, 2.5, 0.8)
  seam(ctx, [[455, 470], [490, 540], [540, 640], [585, 735]], palette.teal, 1.5, 0.6)
  seam(ctx, [[420, 870], [520, 812], [640, 760]], palette.cyan, 2, 0.6)
  seam(ctx, [[430, 918], [560, 925], [700, 920]], palette.teal, 1.5, 0.5)
  // spine nodes
  ctx.fillStyle = WHITE
  ctx.shadowColor = palette.cyan
  ctx.shadowBlur = 12
  for (const [x, y] of [[600, 455], [618, 500], [630, 548], [642, 596]] as Pt[]) {
    ctx.fillRect(x - 4, y - 2, 8, 4)
  }
  ctx.shadowBlur = 0
}

function drawHead(ctx: CanvasRenderingContext2D) {
  // lowered and tipped forward, looking down at the street
  ctx.translate(480, 345)
  ctx.rotate(0.22)
  ctx.translate(-480, -322)
  // hair: an asymmetric bob, cropped high at the nape, with one long blade-cut lock
  // sweeping past the jaw and a diagonal fringe
  const hair = path((p) => {
    p.moveTo(384, 226) // fringe tip over the brow
    p.lineTo(392, 214)
    p.lineTo(398, 222)
    p.bezierCurveTo(404, 196, 420, 174, 448, 162)
    p.bezierCurveTo(505, 140, 572, 170, 574, 232) // crown → back
    p.bezierCurveTo(576, 268, 566, 300, 552, 330) // back of the bob
    // blade-cut ends, longer toward the face
    p.lineTo(546, 318)
    p.lineTo(536, 340)
    p.lineTo(528, 324)
    p.lineTo(515, 346)
    p.lineTo(506, 326)
    p.lineTo(492, 342)
    p.bezierCurveTo(486, 312, 478, 280, 470, 258) // under-layer above the ear
    p.bezierCurveTo(462, 310, 452, 360, 430, 405) // long front lock
    p.lineTo(424, 388)
    p.lineTo(418, 396)
    p.bezierCurveTo(426, 340, 430, 290, 424, 244)
    p.bezierCurveTo(414, 236, 402, 234, 384, 226)
  })

  // face and skull in profile, facing left
  const head = path((p) => {
    p.moveTo(398, 190) // hairline
    p.bezierCurveTo(382, 205, 374, 228, 373, 246) // forehead
    p.lineTo(371, 252) // brow
    p.bezierCurveTo(374, 258, 372, 264, 366, 272) // bridge
    p.lineTo(352, 288) // nose tip
    p.bezierCurveTo(354, 293, 362, 296, 369, 296) // nose base
    p.bezierCurveTo(366, 300, 364, 303, 365, 306) // upper lip
    p.bezierCurveTo(368, 309, 371, 309, 370, 312) // mouth
    p.bezierCurveTo(364, 316, 366, 321, 372, 323) // lower lip
    p.bezierCurveTo(377, 326, 375, 330, 372, 334) // chin dip
    p.bezierCurveTo(372, 345, 382, 352, 400, 352) // chin
    p.bezierCurveTo(430, 350, 455, 340, 470, 325) // jaw
    p.bezierCurveTo(500, 300, 520, 270, 520, 230) // back of the skull
    p.bezierCurveTo(518, 185, 470, 165, 430, 170)
    p.bezierCurveTo(415, 172, 405, 180, 398, 190)
  })
  const skin = ctx.createLinearGradient(350, 180, 520, 350)
  skin.addColorStop(0, 'rgba(255, 210, 245, 0.62)')
  skin.addColorStop(1, 'rgba(200, 90, 255, 0.4)')
  // keep the skull's outline from showing through the hair
  ctx.save()
  const outside = new Path2D()
  outside.rect(0, 0, 1000, 1000)
  outside.addPath(hair)
  ctx.clip(outside, 'evenodd')
  part(ctx, head, skin, WHITE, 2.5)
  ctx.restore()

  // ear with a small interface port behind it
  seam(ctx, [[470, 262], [462, 278], [468, 296], [476, 290]], SKIN, 2, 0.7)
  ctx.save()
  ctx.strokeStyle = palette.cyan
  ctx.shadowColor = palette.cyan
  ctx.shadowBlur = 10
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(492, 300, 7, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = palette.cyan
  ctx.fillRect(500, 298, 18, 3)
  ctx.fillRect(504, 306, 12, 2)
  ctx.restore()

  // visor: a thin light bar across the eye instead of a drawn eye
  ctx.save()
  ctx.shadowColor = palette.magenta
  ctx.shadowBlur = 16
  const visor = ctx.createLinearGradient(360, 0, 455, 0)
  visor.addColorStop(0, '#ffffff')
  visor.addColorStop(0.6, palette.magenta)
  visor.addColorStop(1, 'rgba(255, 43, 214, 0)')
  ctx.fillStyle = visor
  ctx.beginPath()
  ctx.moveTo(366, 254)
  ctx.lineTo(452, 249)
  ctx.lineTo(452, 255)
  ctx.lineTo(370, 262)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  // lip light
  seam(ctx, [[367, 309], [376, 311]], palette.magenta, 2, 0.9)

  const hairFill = ctx.createLinearGradient(380, 150, 520, 390)
  hairFill.addColorStop(0, 'rgba(225, 255, 255, 0.7)')
  hairFill.addColorStop(0.5, 'rgba(110, 220, 255, 0.55)')
  hairFill.addColorStop(1, 'rgba(140, 90, 255, 0.45)')
  part(ctx, hair, hairFill, HAIR, 2.5)
  // strands
  ctx.save()
  ctx.clip(hair)
  for (let i = 0; i < 26; i++) {
    const t = i / 25
    const x0 = 392 + t * 150
    seam(ctx, [[x0, 170 + t * 10], [x0 + 12 - t * 30, 230], [x0 - 30 + t * 10, 300 + t * 20], [x0 - 50, 400]], WHITE, 1, 0.35)
  }
  ctx.restore()
}

function drawArm(ctx: CanvasRenderingContext2D) {
  const fill = bodyGradient(ctx, 420, 680, 0.38)
  // pointing arm: shoulder → elbow (down and forward) → wrist (reaching out toward the street)
  part(ctx, limb([[535, 432, 44], [470, 510, 33], [425, 565, 27], [340, 590, 24], [250, 608, 20]]), fill, palette.magenta)

  // hand
  const handFill = 'rgba(255, 190, 240, 0.48)'
  part(ctx, limb([[262, 606, 21], [222, 616, 20], [200, 622, 18]]), handFill, WHITE, 2) // palm
  part(ctx, limb([[208, 620, 9], [160, 630, 7.5], [118, 638, 6]]), handFill, WHITE, 2) // index finger
  part(ctx, limb([[232, 604, 8], [205, 596, 7], [186, 600, 6]]), handFill, WHITE, 2) // thumb
  for (const [i, dy] of [[0, 0], [1, 13], [2, 25]] as Pt[]) {
    // curled fingers tucked under the palm
    part(ctx, limb([[214 + i * 4, 634 + dy * 0.6, 8], [190 + i * 5, 645 + dy * 0.7, 7], [196 + i * 5, 658 + dy * 0.6, 6]]), handFill, SKIN, 1.5)
  }
  // fingertip light
  const tip = ctx.createRadialGradient(116, 638, 0, 116, 638, 40)
  tip.addColorStop(0, 'rgba(255,255,255,0.9)')
  tip.addColorStop(0.3, 'rgba(255,43,214,0.35)')
  tip.addColorStop(1, 'rgba(255,43,214,0)')
  ctx.fillStyle = tip
  ctx.fillRect(70, 590, 100, 100)

  // sleeve seams and a wrist band
  seam(ctx, [[505, 470], [462, 530], [420, 580], [330, 600]], palette.cyan, 2.5, 0.8)
  seam(ctx, [[268, 588], [275, 628]], palette.cyan, 4)
}

/** Soft halo and the horizontal light streaks a projected image smears into the haze. */
function drawAura(ctx: CanvasRenderingContext2D) {
  const halo = ctx.createRadialGradient(500, 520, 40, 500, 520, 470)
  halo.addColorStop(0, 'rgba(170, 60, 255, 0.22)')
  halo.addColorStop(0.5, 'rgba(255, 43, 214, 0.08)')
  halo.addColorStop(1, 'rgba(255, 43, 214, 0)')
  ctx.fillStyle = halo
  ctx.fillRect(0, 80, 1000, 920)

  let s = 7
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 70; i++) {
    const y = 150 + rand() * 780
    // streaks start inside the silhouette and trail off to the left (toward the street)
    const x1 = y < 380 ? 470 + rand() * 60 : 480 + rand() * 160
    const len = 120 + rand() * 340
    const g = ctx.createLinearGradient(x1, 0, x1 - len, 0)
    const color = y < 380 ? '120, 230, 255' : rand() < 0.5 ? '255, 43, 214' : '170, 90, 255'
    g.addColorStop(0, `rgba(${color}, ${0.18 + rand() * 0.25})`)
    g.addColorStop(1, `rgba(${color}, 0)`)
    ctx.fillStyle = g
    ctx.fillRect(x1 - len, y, len, 1 + rand() * 3)
  }
}

const PAINT: Record<MuseLayer, (ctx: CanvasRenderingContext2D) => void> = {
  aura: drawAura,
  body: drawBody,
  head: drawHead,
  arm: drawArm,
}

/** Draw one layer, mapping its figure-space rectangle onto the whole canvas. */
export const drawMuseLayer =
  (layer: MuseLayer): Draw =>
  (ctx, w, h) => {
    const [x0, y0, x1, y1] = MUSE_RECTS[layer]
    ctx.save()
    ctx.scale(w / (x1 - x0), h / (y1 - y0))
    ctx.translate(-x0, -y0)
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    PAINT[layer](ctx)
    ctx.restore()
  }
