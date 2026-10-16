import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  InstancedBufferAttribute,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from 'three'
import { palette } from '../theme'
import { glowFogPars } from '../shaders/common'
import { AVENUE, PLAZA_RADIUS, SPOKE_COUNT } from './cityLayout'
import { sceneClock } from './sceneTime'

// Light-trail traffic along the spoke roads and the avenue. Every car is one instanced
// streak whose position is computed in the vertex shader, so there is no per-frame CPU work.

const ROAD_LENGTH = 1300
const SPACING = 42

const vertex = /* glsl */ `
attribute vec4 aRoad;   // origin.xz, direction.xz
attribute vec4 aCar;    // lateral offset, speed, phase, streak length
attribute vec3 aColor;
uniform float uTime;
uniform float uRoadLength;
varying float vT;
varying float vFade;
varying vec3 vColor;
varying float vFogDepth;

void main() {
  float s = mod(aCar.z + uTime * aCar.y, uRoadLength);
  vec2 dir = aRoad.zw;
  vec2 side = vec2(-dir.y, dir.x);
  vec2 c = aRoad.xy + dir * s + side * aCar.x;

  vec3 l = position * vec3(aCar.w, 0.5, 0.9);
  vec3 world = vec3(c.x + dir.x * l.x + side.x * l.z, 1.0 + l.y, c.y + dir.y * l.x + side.y * l.z);

  vT = position.x + 0.5;                       // 0 = tail, 1 = head
  vFade = smoothstep(0.0, 60.0, s) * (1.0 - smoothstep(uRoadLength - 120.0, uRoadLength, s));
  vColor = aColor;

  vec4 mv = viewMatrix * vec4(world, 1.0);
  vFogDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`

const fragment = /* glsl */ `
varying float vT;
varying float vFade;
varying vec3 vColor;
varying float vFogDepth;
${glowFogPars}
void main() {
  vec3 col = vColor * (vT * vT * 2.4 + 0.08) * vFade * glowFog(vFogDepth);
  gl_FragColor = vec4(min(col, vec3(24.0)), 1.0);
}
`

const HEAD = new Color('#e6f7ff')
const TAIL = new Color(palette.orange)
const NEON = [new Color(palette.cyan), new Color(palette.magenta)]

interface Lane {
  ox: number
  oz: number
  dx: number
  dz: number
  offset: number
  count: number
  color: Color
}

function buildLanes(): Lane[] {
  const lanes: Lane[] = []
  for (let k = 0; k < SPOKE_COUNT; k++) {
    const a = (k / SPOKE_COUNT) * Math.PI * 2
    const dx = Math.cos(a)
    const dz = Math.sin(a)
    const count = Math.floor(ROAD_LENGTH / SPACING)
    // outbound (tail lights, moving away from the plaza) and inbound (headlights).
    // Reversing the direction also flips the lateral side, so both use positive offsets.
    for (const offset of [4, 9]) {
      lanes.push({ ox: dx * PLAZA_RADIUS, oz: dz * PLAZA_RADIUS, dx, dz, offset, count, color: TAIL })
      lanes.push({
        ox: dx * (PLAZA_RADIUS + ROAD_LENGTH), oz: dz * (PLAZA_RADIUS + ROAD_LENGTH),
        dx: -dx, dz: -dz, offset, count, color: HEAD,
      })
    }
  }
  // extra lanes on the wide project avenue
  for (const offset of [18, 27]) {
    lanes.push({ ox: AVENUE.x0, oz: 0, dx: 1, dz: 0, offset, count: 14, color: TAIL })
    lanes.push({ ox: AVENUE.x0 + ROAD_LENGTH, oz: 0, dx: -1, dz: 0, offset, count: 14, color: HEAD })
  }
  return lanes
}

export function Traffic({ density = 1 }: { density?: number }) {
  const { geometry, count } = useMemo(() => {
    let seed = 7
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const road: number[] = []
    const car: number[] = []
    const color: number[] = []
    for (const lane of buildLanes()) {
      const n = Math.round(lane.count * density)
      for (let i = 0; i < n; i++) {
        road.push(lane.ox, lane.oz, lane.dx, lane.dz)
        car.push(lane.offset + (rand() - 0.5), 28 + rand() * 30, rand() * ROAD_LENGTH, 9 + rand() * 10)
        const c = rand() < 0.08 ? NEON[Math.floor(rand() * 2)] : lane.color
        color.push(c.r, c.g, c.b)
      }
    }
    const g = new BoxGeometry(1, 1, 1)
    g.setAttribute('aRoad', new InstancedBufferAttribute(new Float32Array(road), 4))
    g.setAttribute('aCar', new InstancedBufferAttribute(new Float32Array(car), 4))
    g.setAttribute('aColor', new InstancedBufferAttribute(new Float32Array(color), 3))
    return { geometry: g, count: road.length / 4 }
  }, [density])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        fog: true,
        uniforms: UniformsUtils.merge([
          UniformsLib.fog,
          { uTime: { value: 0 }, uRoadLength: { value: ROAD_LENGTH } },
        ]),
      }),
    [],
  )

  useFrame(() => (material.uniforms.uTime.value = sceneClock.time))

  return <instancedMesh args={[geometry, material, count]} frustumCulled={false} renderOrder={3} />
}
