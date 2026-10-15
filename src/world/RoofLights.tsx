import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  Color,
  InstancedBufferAttribute,
  PlaneGeometry,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from 'three'
import { palette } from '../theme'
import { glowFogPars } from '../shaders/common'
import { getCity } from './cityLayout'

// Red aviation beacons on tall rooftops: camera-facing sprites that keep a minimum
// on-screen size, each blinking on its own period and phase.

const MIN_HEIGHT = 70

const vertex = /* glsl */ `
attribute vec3 aPos;
attribute vec2 aBlink;   // period (s), phase (0..1)
uniform float uTime;
varying vec2 vUv;
varying float vOn;
varying float vFogDepth;

void main() {
  vec4 mv = viewMatrix * vec4(aPos, 1.0);
  float dist = -mv.z;
  float size = max(2.2, dist * 0.0065);
  mv.xy += position.xy * size;
  vUv = position.xy * 2.0;

  float c = fract(uTime / aBlink.x + aBlink.y);
  vOn = smoothstep(0.0, 0.03, c) * (1.0 - smoothstep(0.1, 0.2, c));
  vFogDepth = dist;
  gl_Position = projectionMatrix * mv;
}
`

const fragment = /* glsl */ `
uniform vec3 uColor;
varying vec2 vUv;
varying float vOn;
varying float vFogDepth;
${glowFogPars}
void main() {
  float d = dot(vUv, vUv);
  float core = exp(-d * 18.0);
  float glow = exp(-d * 4.0) * 0.35;
  float intensity = (core * 4.0 + glow) * (0.12 + vOn);
  // beacons are meant to read through haze, so they get only half the fog
  vec3 col = uColor * intensity * mix(1.0, glowFog(vFogDepth), 0.5);
  gl_FragColor = vec4(min(col, vec3(24.0)), 1.0);
}
`

export function RoofLights({ density = 1 }: { density?: number }) {
  const { geometry, count } = useMemo(() => {
    let seed = 99
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const pos: number[] = []
    const blink: number[] = []
    const city = getCity(density)
    // tiers with another tier stacked on top don't get beacons
    const covered = new Set(city.filter((o) => o.y0 > 0).map((o) => `${o.x},${o.z},${o.y0}`))
    for (const b of city) {
      const top = b.y0 + b.h
      if (top < MIN_HEIGHT || covered.has(`${b.x},${b.z},${top}`)) continue
      const period = 1.4 + rand() * 1.4
      const phase = rand()
      const corners =
        Math.min(b.w, b.d) >= 40
          ? [[-1, -1], [1, -1], [-1, 1], [1, 1]]
          : Math.min(b.w, b.d) < 8
            ? [[0, 0]]
            : [[rand() < 0.5 ? -1 : 1, rand() < 0.5 ? -1 : 1]]
      for (const [sx, sz] of corners) {
        pos.push(b.x + sx * (b.w / 2 - 1.5), top + 1.2, b.z + sz * (b.d / 2 - 1.5))
        blink.push(period, phase) // corners of one roof blink together
      }
    }
    const g = new PlaneGeometry(1, 1)
    g.setAttribute('aPos', new InstancedBufferAttribute(new Float32Array(pos), 3))
    g.setAttribute('aBlink', new InstancedBufferAttribute(new Float32Array(blink), 2))
    return { geometry: g, count: pos.length / 3 }
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
          { uTime: { value: 0 }, uColor: { value: new Color(palette.red) } },
        ]),
      }),
    [],
  )

  useFrame((s) => (material.uniforms.uTime.value = s.clock.elapsedTime))

  return <instancedMesh args={[geometry, material, count]} frustumCulled={false} renderOrder={4} />
}
