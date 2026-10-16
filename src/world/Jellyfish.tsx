import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  MathUtils,
  ShaderMaterial,
  SphereGeometry,
  UniformsLib,
  UniformsUtils,
  Vector3,
} from 'three'
import { useApp } from '../store'
import { SETTINGS } from '../quality'
import { palette } from '../theme'
import { glowFogPars, hashGLSL } from '../shaders/common'
import { JELLY } from './landmarks'

// The street hologram: an original jellyfish drifting over the project avenue. Pure shader
// geometry in unit-bell space (bell radius 1), scaled per creature:
// - the bell: a pulsing dome with a fresnel rim, radial ribs and light bands rising through it,
// - 36 trailing tentacles and 4 frilly oral arms as camera-facing ribbons with beads of light
//   travelling down them.
// One big jellyfish plus two small companions orbiting it. 2 draw calls each.

const TENTACLES = 36
const ARMS = 4
const SEGMENTS = 28

const shared = /* glsl */ `
uniform float uTime;
uniform float uPhase;
float pulseOf() { return sin(uTime * 1.3 + uPhase); }
`

// ── bell ─────────────────────────────────────────────────────
const bellVertex = /* glsl */ `
${shared}
varying vec3 vLocal;
varying vec3 vNormal;
varying vec3 vView;
varying float vFogDepth;
void main() {
  vec3 p = position;
  p.y *= 0.8;
  float pulse = pulseOf();
  // contract-and-flare: the rim swings in and out, the dome flattens a little
  p.xz *= 1.0 + 0.12 * pulse * (1.0 - 0.5 * p.y);
  p.y *= 1.0 - 0.08 * pulse;
  // rippling frill along the rim
  float rim = 1.0 - smoothstep(-0.15, 0.35, position.y);
  p.y += sin(atan(position.z, position.x) * 9.0 + uTime * 2.0) * 0.025 * rim;
  vLocal = vec3(position.x, position.y, position.z);
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vView = -mv.xyz;
  vFogDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`

const bellFragment = /* glsl */ `
${shared}
uniform float uOpacity;
uniform float uScale;
uniform vec3 uCyan;
uniform vec3 uMagenta;
uniform vec3 uPurple;
varying vec3 vLocal;
varying vec3 vNormal;
varying vec3 vView;
varying float vFogDepth;
${glowFogPars}
${hashGLSL}

void main() {
  float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.2);
  float ang = atan(vLocal.z, vLocal.x);
  float ribs = pow(abs(sin(ang * 12.0)), 20.0) * smoothstep(-0.2, 0.2, vLocal.y);
  float bands = pow(0.5 + 0.5 * sin(vLocal.y * 13.0 - uTime * 1.6), 7.0);
  float h = smoothstep(-0.15, 1.0, vLocal.y);
  vec3 base = mix(uMagenta, uCyan, h);
  base = mix(base, uPurple * 1.4, 0.25 * (1.0 - h));

  float lit = 0.05 + fres * 0.95 + ribs * 0.5 + bands * 0.22 * (0.4 + h);
  // a hot rim where the bell meets the tentacles
  lit += smoothstep(0.2, -0.12, vLocal.y) * 0.5;

  float scan = 0.84 + 0.16 * sin(gl_FragCoord.y * 1.6 + uTime * 6.0);
  float flicker = 0.94 + 0.06 * sin(uTime * 21.0 + uPhase * 9.0) * sin(uTime * 6.0);
  // anything close to the camera dissolves instead of filling the screen
  float near = smoothstep(uScale * 0.6, uScale * 2.2, vFogDepth);
  vec3 col = base * lit * scan * flicker * 1.7 * uOpacity * near * glowFog(vFogDepth);
  gl_FragColor = vec4(min(col, vec3(24.0)), 1.0);
}
`

// ── tentacles and oral arms ──────────────────────────────────
const strandVertex = /* glsl */ `
${shared}
uniform float uScale;
attribute vec3 aRoot;
attribute float aT;
attribute float aSide;
attribute float aSeed;
attribute float aLen;
attribute float aWidth;
attribute float aSway;
varying float vT;
varying float vSide;
varying float vSeed;
varying float vFogDepth;
void main() {
  float pulse = pulseOf();
  vec3 root = aRoot;
  // roots ride the bell's contraction
  root.xz *= 1.0 + 0.12 * pulse;
  root.y *= 1.0 - 0.08 * pulse;

  float t2 = aT * aT;
  vec3 p = root;
  p.y -= aT * aLen * (1.0 + 0.1 * pulse);
  // travelling waves; the tips lag behind and pull inward on each pulse
  p.x += sin(aT * 6.0 - uTime * 2.2 + aSeed * 6.283) * 0.22 * aSway * t2;
  p.z += cos(aT * 5.0 - uTime * 1.7 + aSeed * 9.0) * 0.22 * aSway * t2;
  p.xz -= normalize(root.xz + 1e-4) * 0.18 * pulse * t2;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  // ribbon faces the camera: widen in view space, tapering toward the tip
  mv.x += aSide * aWidth * uScale * (1.0 - 0.8 * aT);
  vT = aT;
  vSide = aSide;
  vSeed = aSeed;
  vFogDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`

const strandFragment = /* glsl */ `
${shared}
uniform float uOpacity;
uniform float uScale;
uniform vec3 uCyan;
uniform vec3 uMagenta;
varying float vT;
varying float vSide;
varying float vSeed;
varying float vFogDepth;
${glowFogPars}

void main() {
  float across = 1.0 - abs(vSide);
  float fade = pow(max(1.0 - vT, 0.0), 1.2);
  // beads of light running down each strand
  float beads = pow(0.5 + 0.5 * sin(vT * 38.0 - uTime * 3.2 + vSeed * 20.0), 9.0);
  vec3 base = mix(uCyan, uMagenta, smoothstep(0.0, 0.8, vT));
  float lit = (0.22 + beads * 1.5) * fade * (0.35 + 0.65 * across);
  float scan = 0.88 + 0.12 * sin(gl_FragCoord.y * 1.6 + uTime * 6.0);
  // long strands hang down toward the camera's flight line: fade them out when close
  float near = smoothstep(uScale * 0.5, uScale * 2.0, vFogDepth);
  vec3 col = base * lit * scan * 1.8 * uOpacity * near * glowFog(vFogDepth);
  gl_FragColor = vec4(min(col, vec3(24.0)), 1.0);
}
`

/** Where the lead jellyfish is; the companions orbit this. */
const lead = new Vector3(JELLY.xMin, JELLY.y, JELLY.z)
let leadX = JELLY.xMin

let bellGeometry: SphereGeometry | null = null
let strandGeometry: BufferGeometry | null = null

function buildStrands() {
  let s = 12345
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647)

  const count = TENTACLES + ARMS
  const verts = count * (SEGMENTS + 1) * 2
  const root = new Float32Array(verts * 3)
  const t = new Float32Array(verts)
  const side = new Float32Array(verts)
  const seed = new Float32Array(verts)
  const len = new Float32Array(verts)
  const width = new Float32Array(verts)
  const sway = new Float32Array(verts)
  const index: number[] = []

  for (let k = 0; k < count; k++) {
    const arm = k >= TENTACLES
    const a = arm ? ((k - TENTACLES) / ARMS) * Math.PI * 2 + 0.4 : (k / TENTACLES) * Math.PI * 2 + (rand() - 0.5) * 0.12
    const r = arm ? 0.16 : 0.93 + rand() * 0.05
    const y = arm ? -0.02 : -0.11
    const L = arm ? 1.1 + rand() * 0.3 : 1.8 + rand() * 1.5
    const w = arm ? 0.065 : 0.011 + rand() * 0.008
    const sw = arm ? 1.6 : 0.8 + rand() * 0.7
    const sd = rand()
    for (let i = 0; i <= SEGMENTS; i++) {
      for (let e = 0; e < 2; e++) {
        const v = (k * (SEGMENTS + 1) + i) * 2 + e
        root.set([Math.cos(a) * r, y, Math.sin(a) * r], v * 3)
        t[v] = i / SEGMENTS
        side[v] = e === 0 ? -1 : 1
        seed[v] = sd
        len[v] = L
        width[v] = w
        sway[v] = sw
      }
      if (i < SEGMENTS) {
        const v = (k * (SEGMENTS + 1) + i) * 2
        index.push(v, v + 1, v + 2, v + 1, v + 3, v + 2)
      }
    }
  }

  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(verts * 3), 3)) // unused, required by three
  g.setAttribute('aRoot', new BufferAttribute(root, 3))
  g.setAttribute('aT', new BufferAttribute(t, 1))
  g.setAttribute('aSide', new BufferAttribute(side, 1))
  g.setAttribute('aSeed', new BufferAttribute(seed, 1))
  g.setAttribute('aLen', new BufferAttribute(len, 1))
  g.setAttribute('aWidth', new BufferAttribute(width, 1))
  g.setAttribute('aSway', new BufferAttribute(sway, 1))
  g.setIndex(index)
  return g
}

function makeMaterial(vertexShader: string, fragmentShader: string, phase: number, scale: number) {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    fog: true,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uTime: { value: 0 },
        uPhase: { value: phase },
        uScale: { value: scale },
        uOpacity: { value: 1 },
        uCyan: { value: new Color(palette.cyan) },
        uMagenta: { value: new Color(palette.magenta) },
        uPurple: { value: new Color(palette.purple) },
      },
    ]),
  })
}

interface JellyProps {
  scale: number
  phase: number
  /** how this one moves: the big one drifts, companions orbit it */
  orbit?: { radius: number; speed: number; height: number; angle: number }
}

function Jelly({ scale, phase, orbit }: JellyProps) {
  const group = useRef<Group>(null)
  const clock = useRef(phase * 7)
  bellGeometry ??= new SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.55)
  strandGeometry ??= buildStrands()

  const [bell, strands] = useMemo(
    () => [makeMaterial(bellVertex, bellFragment, phase, scale), makeMaterial(strandVertex, strandFragment, phase, scale)],
    [phase, scale],
  )

  useFrame(({ camera }, rawDelta) => {
    const { reducedMotion } = useApp.getState()
    // reduced motion: keep it alive but nearly still
    clock.current += Math.min(rawDelta, 0.1) * (reducedMotion ? 0.12 : 1)
    const t = clock.current
    const g = group.current!
    const { wander } = JELLY

    if (orbit) {
      // companions circle the big one, bobbing and tilting with their own pulse
      const a = orbit.angle + t * orbit.speed
      g.position.set(
        lead.x + Math.cos(a) * orbit.radius,
        lead.y + orbit.height + Math.sin(t * 0.9 + phase) * 3,
        lead.z + Math.sin(a) * orbit.radius,
      )
    } else {
      // stays ahead of the camera down the avenue, so its tentacles never sweep over the lens
      const target = MathUtils.clamp(camera.position.x + JELLY.lead, JELLY.xMin, JELLY.xMax)
      leadX = MathUtils.damp(leadX, target, 1.2, Math.min(rawDelta, 0.1))
      g.position.set(
        leadX + Math.sin(t * 0.07) * wander.x,
        JELLY.y + Math.sin(t * 0.21) * wander.y,
        JELLY.z + Math.sin(t * 0.09) * wander.z,
      )
      lead.copy(g.position)
    }
    g.rotation.y = t * 0.06 + phase
    g.rotation.z = Math.sin(t * 0.17 + phase) * 0.06
    g.rotation.x = Math.cos(t * 0.13 + phase) * 0.05

    // far away (the orbit epilogue, the hero shot) it is a speck: skip it
    g.visible = camera.position.distanceTo(g.position) < 1800
    bell.uniforms.uTime.value = t
    strands.uniforms.uTime.value = t
  })

  return (
    <group ref={group} scale={scale}>
      <mesh geometry={bellGeometry} material={bell} renderOrder={4} frustumCulled={false} />
      <mesh geometry={strandGeometry} material={strands} renderOrder={4} frustumCulled={false} />
    </group>
  )
}

export function Jellyfish() {
  const { companions } = SETTINGS[useApp((s) => s.tier)]
  const R = JELLY.radius
  return (
    <>
      <Jelly scale={R} phase={0} />
      {companions >= 1 && <Jelly scale={R * 0.3} phase={2.1} orbit={{ radius: R * 3.2, speed: 0.11, height: 8, angle: 0 }} />}
      {companions >= 2 && <Jelly scale={R * 0.2} phase={4.2} orbit={{ radius: R * 4.4, speed: -0.08, height: -4, angle: 2.4 }} />}
    </>
  )
}
