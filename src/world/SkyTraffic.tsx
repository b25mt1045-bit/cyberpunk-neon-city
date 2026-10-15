import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  Object3D,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from 'three'
import { palette } from '../theme'
import { glowFogPars } from '../shaders/common'
import { PLAZA_RADIUS } from './cityLayout'

// Flying vehicles. Straight lanes run above the spoke roads (always clear of buildings)
// and cross over the plaza; one ring lane circles above the plaza. ~70 vehicles,
// positioned on the CPU each frame. Each has a body and an additive light trail.

const HALF_SPAN = 1250
const BODY = { len: 7, h: 1.6, w: 3 }
const TRAIL_LEN = 34

interface Lane {
  kind: 'line' | 'ring'
  angle: number
  height: number
  offset: number
  dir: 1 | -1
}

const LANES: Lane[] = [
  // straight lanes along spoke axes (each spans two opposite spokes through the plaza)
  ...[0, 1, 2, 3].flatMap((k, i) => {
    const angle = (k * Math.PI) / 4
    const height = [92, 120, 75, 140][i]
    return [
      { kind: 'line' as const, angle, height, offset: 5, dir: 1 as const },
      { kind: 'line' as const, angle, height: height + 8, offset: -5, dir: -1 as const },
    ]
  }),
  { kind: 'ring', angle: 0, height: 62, offset: PLAZA_RADIUS - 18, dir: 1 },
]

interface Vehicle {
  lane: Lane
  speed: number
  phase: number
  bob: number
}

const bodyVertex = /* glsl */ `
attribute vec3 aAccent;
varying vec3 vL;
varying vec3 vN;
varying vec3 vAccent;
#include <fog_pars_vertex>
void main() {
  vL = position;
  vN = normal;
  vAccent = aAccent;
  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`

const bodyFragment = /* glsl */ `
uniform vec3 uHead;
uniform vec3 uTail;
varying vec3 vL;
varying vec3 vN;
varying vec3 vAccent;
#include <fog_pars_fragment>
void main() {
  vec3 col = vec3(0.025, 0.028, 0.045) + max(vN.y, 0.0) * 0.03;
  float front = step(0.45, vN.x);
  float rear = step(0.45, -vN.x);
  float lamps = step(0.22, abs(vL.z)) * step(vL.y, 0.1);
  col += uHead * front * lamps * 3.0;
  col += uTail * rear * (0.6 + lamps * 2.0);
  // underglow strip along the sides
  float side = step(0.5, abs(vN.z)) * (1.0 - smoothstep(-0.42, -0.3, vL.y));
  col += vAccent * side * 2.5;
  gl_FragColor = vec4(min(col, vec3(24.0)), 1.0);
  #include <fog_fragment>
}
`

const trailVertex = /* glsl */ `
attribute vec3 aAccent;
varying float vT;
varying vec3 vAccent;
varying float vFogDepth;
void main() {
  vT = position.x + 0.5;
  vAccent = aAccent;
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vFogDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`

const trailFragment = /* glsl */ `
varying float vT;
varying vec3 vAccent;
varying float vFogDepth;
${glowFogPars}
void main() {
  vec3 col = vAccent * pow(vT, 3.0) * 1.4 * glowFog(vFogDepth);
  gl_FragColor = vec4(min(col, vec3(24.0)), 1.0);
}
`

const ACCENTS = [palette.cyan, palette.magenta, palette.teal, palette.orange]

export function SkyTraffic({ density = 1 }: { density?: number }) {
  const bodies = useRef<InstancedMesh>(null)
  const trails = useRef<InstancedMesh>(null)

  const vehicles = useMemo(() => {
    let seed = 4242
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const list: Vehicle[] = []
    for (const lane of LANES) {
      const n = Math.round((lane.kind === 'ring' ? 6 : 8) * density)
      for (let i = 0; i < n; i++) {
        list.push({
          lane,
          speed: lane.kind === 'ring' ? 0.12 + rand() * 0.04 : 45 + rand() * 30,
          phase: (i + rand() * 0.6) / n,
          bob: rand() * Math.PI * 2,
        })
      }
    }
    return list
  }, [density])

  const { bodyGeo, trailGeo } = useMemo(() => {
    const accents = new Float32Array(vehicles.length * 3)
    vehicles.forEach((_, i) => {
      const c = new Color(ACCENTS[i % ACCENTS.length])
      accents.set([c.r, c.g, c.b], i * 3)
    })
    const bodyGeo = new BoxGeometry(1, 1, 1)
    bodyGeo.setAttribute('aAccent', new InstancedBufferAttribute(accents, 3))
    const trailGeo = new BoxGeometry(1, 1, 1)
    trailGeo.setAttribute('aAccent', new InstancedBufferAttribute(accents, 3))
    return { bodyGeo, trailGeo }
  }, [vehicles])

  const [bodyMat, trailMat] = useMemo(
    () => [
      new ShaderMaterial({
        vertexShader: bodyVertex,
        fragmentShader: bodyFragment,
        fog: true,
        uniforms: UniformsUtils.merge([
          UniformsLib.fog,
          { uHead: { value: new Color('#e6f7ff') }, uTail: { value: new Color(palette.orange) } },
        ]),
      }),
      new ShaderMaterial({
        vertexShader: trailVertex,
        fragmentShader: trailFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        fog: true,
        uniforms: UniformsUtils.merge([UniformsLib.fog]),
      }),
    ],
    [],
  )

  const o = useMemo(() => new Object3D(), [])

  const place = (t: number) => {
    const b = bodies.current
    const tr = trails.current
    if (!b || !tr) return
    vehicles.forEach((v, i) => {
      const { lane } = v
      let x: number, z: number, heading: number
      if (lane.kind === 'ring') {
        const a = (v.phase + t * v.speed) * Math.PI * 2
        x = Math.cos(a) * lane.offset
        z = Math.sin(a) * lane.offset
        heading = a + Math.PI / 2 // tangent, counter-clockwise
      } else {
        const span = HALF_SPAN * 2
        const s = (((v.phase * span + t * v.speed) % span) + span) % span - HALF_SPAN
        const dx = Math.cos(lane.angle)
        const dz = Math.sin(lane.angle)
        const along = s * lane.dir
        x = dx * along - dz * lane.offset
        z = dz * along + dx * lane.offset
        heading = lane.angle + (lane.dir < 0 ? Math.PI : 0)
      }
      const y = lane.height + Math.sin(t * 1.3 + v.bob) * 0.8
      const hx = Math.cos(heading)
      const hz = Math.sin(heading)

      o.position.set(x, y, z)
      o.rotation.set(0, -heading, 0)
      o.scale.set(BODY.len, BODY.h, BODY.w)
      o.updateMatrix()
      b.setMatrixAt(i, o.matrix)

      o.position.set(x - hx * (TRAIL_LEN / 2 + BODY.len / 2), y - 0.3, z - hz * (TRAIL_LEN / 2 + BODY.len / 2))
      o.scale.set(TRAIL_LEN, 0.35, 1.6)
      o.updateMatrix()
      tr.setMatrixAt(i, o.matrix)
    })
    b.instanceMatrix.needsUpdate = true
    tr.instanceMatrix.needsUpdate = true
  }

  useLayoutEffect(() => place(0))
  useFrame((s) => place(s.clock.elapsedTime))

  return (
    <>
      <instancedMesh ref={bodies} args={[bodyGeo, bodyMat, vehicles.length]} frustumCulled={false} />
      <instancedMesh ref={trails} args={[trailGeo, trailMat, vehicles.length]} frustumCulled={false} renderOrder={3} />
    </>
  )
}
