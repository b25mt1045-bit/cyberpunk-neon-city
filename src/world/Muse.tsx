import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, Group, MathUtils, ShaderMaterial, UniformsLib, UniformsUtils, Vector3 } from 'three'
import { useApp } from '../store'
import { palette } from '../theme'
import { glowFogPars } from '../shaders/common'
import { HoloPanel } from './holo/HoloPanel'
import { MUSE_RECTS, drawMuseLayer, type MuseLayer } from './holo/museArt'
import { MUSE, normalOf } from './landmarks'

// The giant street hologram: an original kneeling figure built from four parallax panels
// (aura behind, body, head, pointing arm in front). She materializes from the ground up as
// the camera reaches the avenue, breathes, glances, glitches now and then, fades out when
// seen edge-on (a projection only reads from the front) and breaks up into glitch when the
// camera flies through her.

const K = MUSE.size / 1000
const LAYERS: { layer: MuseLayer; depth: number; px: number; boost: number; seed: number }[] = [
  { layer: 'aura', depth: -10, px: 1024, boost: 1.3, seed: 60 },
  { layer: 'body', depth: 0, px: 1024, boost: 1.6, seed: 61 },
  { layer: 'head', depth: 3, px: 768, boost: 1.7, seed: 62 },
  { layer: 'arm', depth: 9, px: 1024, boost: 1.7, seed: 63 },
]
/** joints the head and arm layers pivot around, in figure space */
const PIVOTS: Partial<Record<MuseLayer, [number, number]>> = { head: [480, 345], arm: [535, 432] }

/** figure space → the group's local frame (x right, y up, origin on the ground at x=500) */
const local = (fx: number, fy: number) => [(fx - 500) * K, (MUSE.groundY - fy) * K] as const

/** Appears between these progress values (the end of the about chapter → the avenue). */
const APPEAR = [0.29, 0.345] as const
const SWEEP_PERIOD = 7

const hash = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453
  return x - Math.floor(x)
}

const normal = normalOf(MUSE.rotY)
const center = new Vector3(MUSE.base.x, 80, MUSE.base.z)
const toCam = new Vector3()
const fromBase = new Vector3()

function Layer({ layer, depth, px, boost, seed, state }: (typeof LAYERS)[number] & { state: MuseState }) {
  const [x0, y0, x1, y1] = MUSE_RECTS[layer]
  const draw = useMemo(() => drawMuseLayer(layer), [layer])
  const pivot = PIVOTS[layer]
  const [cx, cy] = local((x0 + x1) / 2, (y0 + y1) / 2)
  const [px0, py0] = pivot ? local(pivot[0], pivot[1]) : [0, 0]
  const size: [number, number] = [(x1 - x0) * K, (y1 - y0) * K]
  const res: [number, number] = [px, Math.round((px * (y1 - y0)) / (x1 - x0))]
  const group = useRef<Group>(null)

  // figure-space y → this panel's uv.y
  const v = (fy: number) => (y1 - fy) / (y1 - y0)

  const onFrame = (m: ShaderMaterial) => {
    const u = m.uniforms
    u.uOpacity.value = state.opacity * (layer === 'aura' ? 0.9 : 1) * state.flicker
    u.uReveal.value = v(state.revealFy)
    u.uSweep.value = v(state.sweepFy)
    const g = group.current!
    g.position.x = px0 + state.jitter * (layer === 'arm' ? 1.6 : 1)
    if (layer === 'head') g.rotation.z = state.headTilt
    if (layer === 'arm') g.rotation.z = state.armLift
  }

  return (
    <group ref={group} position={[px0, py0, depth]}>
      <HoloPanel draw={draw} px={res} size={size} position={[cx - px0, cy - py0, 0]} boost={boost} seed={seed} fogScale={0.55} onFrame={onFrame} />
    </group>
  )
}

interface MuseState {
  opacity: number
  flicker: number
  jitter: number
  revealFy: number
  sweepFy: number
  headTilt: number
  armLift: number
}

const floorVertex = /* glsl */ `
varying vec2 vUv;
varying float vFogDepth;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vFogDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`
const floorFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;
varying vec2 vUv;
varying float vFogDepth;
${glowFogPars}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float pool = exp(-r * r * 3.0) * (1.0 - smoothstep(0.85, 1.0, r));
  // emitter rings pulsing outward
  float rings = smoothstep(0.08, 0.0, abs(fract(r * 3.0 - uTime * 0.25) - 0.5) - 0.42) * (1.0 - r);
  vec3 col = uColor * (pool * 0.9 + max(rings, 0.0) * 0.5) * uOpacity * glowFog(vFogDepth);
  gl_FragColor = vec4(min(col, vec3(24.0)), 1.0);
}
`

export function Muse() {
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  const state = useRef<MuseState>({ opacity: 0, flicker: 1, jitter: 0, revealFy: 1000, sweepFy: -1000, headTilt: 0, armLift: 0 }).current

  const floor = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: floorVertex,
        fragmentShader: floorFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        fog: true,
        uniforms: UniformsUtils.merge([
          UniformsLib.fog,
          { uColor: { value: new Color(palette.magenta) }, uOpacity: { value: 0 }, uTime: { value: 0 } },
        ]),
      }),
    [],
  )

  useFrame((s, delta) => {
    const { progress, reducedMotion } = useApp.getState()
    const t = s.clock.elapsedTime
    const motion = reducedMotion ? 0 : 1

    // materialize from the ground up as the camera arrives
    const appear = MathUtils.smoothstep(progress, APPEAR[0], APPEAR[1])
    state.revealFy = MathUtils.lerp(MUSE.groundY + 20, 60, appear)

    // a projection only reads from the front: fade when seen edge-on or from behind
    toCam.subVectors(s.camera.position, center).normalize()
    const facing = MathUtils.smoothstep(toCam.dot(normal), 0.08, 0.4)
    // too close to read: break up and fade instead of filling the screen
    const planeDist = fromBase.subVectors(s.camera.position, MUSE.base).dot(normal)
    const breakup = 1 - MathUtils.smoothstep(planeDist, 45, 130)
    const target = Math.min(appear * 4, 1) * facing * (1 - breakup * 0.85)
    state.opacity = MathUtils.damp(state.opacity, target, 6, delta)
    root.current!.visible = state.opacity > 0.01

    // scan line climbing the figure every few seconds
    const phase = (t % SWEEP_PERIOD) / 2.2
    state.sweepFy = motion && phase < 1 ? MathUtils.lerp(MUSE.groundY, 80, phase) : -1000

    // glitch bursts: a short, irregular window every ~5 s where the layers jump sideways
    const cycle = Math.floor(t / 5)
    const tick = Math.floor(t * 30)
    const inBurst = motion > 0 && ((t % 5 < 0.22 && hash(cycle) > 0.35) || hash(tick + 3) < breakup * 0.5)
    state.jitter = inBurst ? (hash(tick) - 0.5) * (4 + breakup * 10) : 0
    state.flicker = inBurst ? 0.35 + hash(tick + 7) * 0.9 : 1

    // idle life: breathing, a slow glance, the pointing hand drifting
    body.current!.scale.y = 1 + Math.sin(t * 1.1) * 0.006 * motion
    state.headTilt = (Math.sin(t * 0.35) * 0.035 + Math.sin(t * 0.9) * 0.01) * motion
    state.armLift = Math.sin(t * 0.5 + 1) * 0.02 * motion

    floor.uniforms.uOpacity.value = state.opacity
    floor.uniforms.uTime.value = t
  })

  return (
    <group ref={root} position={MUSE.base.toArray()} rotation={[0, MUSE.rotY, 0]}>
      <group ref={body}>
        {LAYERS.map((l) => (
          <Layer key={l.layer} {...l} state={state} />
        ))}
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.4, 10]} material={floor} renderOrder={2}>
        <planeGeometry args={[MUSE.size * 1.1, 70]} />
      </mesh>
    </group>
  )
}
