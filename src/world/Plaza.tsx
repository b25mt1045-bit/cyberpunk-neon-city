import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, ShaderMaterial, UniformsLib, UniformsUtils } from 'three'
import { palette } from '../theme'
import { glowFogPars } from '../shaders/common'
import { PLAZA_RADIUS, SPOKE_COUNT } from './cityLayout'
import { sceneClock } from './sceneTime'

// Animated holographic sigil on the central plaza: counter-rotating rings,
// an eight-point star, orbiting arcs, tick marks and a pulse wave that travels outward.

const R = PLAZA_RADIUS - 8

const vertex = /* glsl */ `
varying vec2 vP;
varying float vFogDepth;
void main() {
  vP = position.xy;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vFogDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`

const fragment = /* glsl */ `
uniform float uTime;
uniform vec3 uCyan;
uniform vec3 uTeal;
uniform vec3 uMagenta;
uniform vec3 uGold;
varying vec2 vP;
varying float vFogDepth;
${glowFogPars}

const float PI = 3.14159265;
const float TAU = 6.2831853;

float line(float d, float w) {
  float aa = fwidth(d);
  return 1.0 - smoothstep(w, w + aa * 1.5, abs(d));
}
float band(float x, float a, float b) { return step(a, x) * step(x, b); }

// distance to the edge of a regular N-gon with apothem ap, rotated by rot
float polygon(float r, float a, float n, float ap, float rot) {
  float an = TAU / n;
  float th = mod(a + rot, an) - an * 0.5;
  return r * cos(th) - ap;
}

void main() {
  float t = uTime;
  float r = length(vP);
  float a = atan(vP.y, vP.x);
  float R = ${R.toFixed(1)};
  vec3 col = vec3(0.0);

  // outer double ring + gold segments
  col += uCyan * line(r - R, 0.45) * 1.4;
  col += uCyan * line(r - (R - 7.0), 0.15) * 0.8;
  float seg = step(0.82, fract((a + t * 0.03) / TAU * 8.0));
  col += uGold * line(r - (R + 3.0), 0.6) * seg * 1.6;

  // tick marks between the outer rings
  float tick = step(abs(fract((a - t * 0.05) / TAU * 144.0) - 0.5), 0.12);
  float major = step(abs(fract((a - t * 0.05) / TAU * 12.0) - 0.5), 0.02);
  col += uCyan * tick * band(r, R - 5.5, R - 2.0) * 0.6;
  col += uCyan * major * band(r, R - 6.5, R - 0.5) * 1.2;

  // rotating dashed ring
  float dash = step(0.45, fract((a - t * 0.12) / TAU * 48.0));
  col += uTeal * line(r - (R * 0.8), 0.5) * dash * 1.3;

  // eight-point star (two overlapping squares, echoing the 8 roads) inside a slow octagon
  float rot = t * 0.06;
  col += uCyan * line(polygon(r, a, 8.0, R * 0.68, rot), 0.3) * 1.1;
  col += uMagenta * line(polygon(r, a, 4.0, R * 0.36, -rot * 1.6), 0.35) * 1.3;
  col += uMagenta * line(polygon(r, a, 4.0, R * 0.36, -rot * 1.6 + PI / 4.0), 0.35) * 1.3;

  // orbiting arcs
  float arcs = step(0.55, fract((a + t * 0.35) / TAU * 5.0));
  col += uGold * arcs * band(r, R * 0.42, R * 0.46) * 1.2;
  float arcs2 = step(0.7, fract((a - t * 0.5) / TAU * 3.0));
  col += uTeal * arcs2 * band(r, R * 0.5, R * 0.52) * 1.2;

  // radial guide lines aligned with the spoke roads
  float sa = TAU / ${SPOKE_COUNT.toFixed(1)};
  float ra = r * sin(a - floor(a / sa + 0.5) * sa);
  col += uCyan * line(ra, 0.15) * band(r, R * 0.55, R - 8.0) * 0.6;

  // core
  col += uCyan * line(r - 9.0, 0.35) * 1.5;
  col += uCyan * smoothstep(9.0, 0.0, r) * (0.25 + 0.15 * sin(t * 3.0));

  // faint fill so the disc reads as a surface, plus a pulse wave moving outward
  float inside = 1.0 - smoothstep(R - 1.0, R + 1.0, r);
  col += uCyan * inside * 0.035;
  float front = mod(t * 22.0, R * 1.6);
  float wave = exp(-pow((r - front) / 5.0, 2.0)) * inside;
  col *= 1.0 + wave * 1.8;
  col += uCyan * wave * 0.12;

  // hologram instability
  col *= 0.9 + 0.1 * sin(t * 17.0 + r * 0.3);

  col *= glowFog(vFogDepth);
  gl_FragColor = vec4(min(col, vec3(24.0)), 1.0);
}
`

export function Plaza() {
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
          {
            uTime: { value: 0 },
            uCyan: { value: new Color(palette.cyan).multiplyScalar(1.2) },
            uTeal: { value: new Color(palette.teal) },
            uMagenta: { value: new Color(palette.magenta) },
            uGold: { value: new Color('#ffc247') },
          },
        ]),
      }),
    [],
  )

  useFrame(() => (material.uniforms.uTime.value = sceneClock.time))

  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.4, 0]} material={material} renderOrder={2}>
      <circleGeometry args={[R + 5, 160]} />
    </mesh>
  )
}
