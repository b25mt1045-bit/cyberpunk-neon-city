import { useMemo } from 'react'
import { Color, ShaderMaterial, UniformsLib, UniformsUtils } from 'three'
import { palette } from '../theme'
import { AVENUE, PLAZA_RADIUS, SPOKE_COUNT, SPOKE_HALF_WIDTH } from './cityLayout'

// Dark asphalt with glowing lane lines along the spokes and the avenue.
// Wet reflections arrive in M3.

const vertex = /* glsl */ `
varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorld = worldPos.xyz;
  vec4 mvPosition = viewMatrix * worldPos;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`

const fragment = /* glsl */ `
uniform vec3 uBase;
uniform vec3 uRoad;
uniform vec3 uCyan;
uniform vec3 uMagenta;
varying vec3 vWorld;
#include <fog_pars_fragment>

const float PI = 3.14159265;

float lineAA(float d, float width) {
  float aa = fwidth(d);
  return 1.0 - smoothstep(width, width + aa * 1.5, abs(d));
}

void main() {
  vec2 p = vWorld.xz;
  float r = length(p);
  vec3 col = uBase;
  vec3 emis = vec3(0.0);

  // grid streets (mostly hidden under buildings, visible between them)
  vec2 gp = mod(p, 42.0) - 21.0;
  float grid = max(lineAA(gp.x, 0.15), lineAA(gp.y, 0.15));
  emis += uCyan * grid * 0.05;

  if (r > ${PLAZA_RADIUS.toFixed(1)}) {
    float stepA = 2.0 * PI / ${SPOKE_COUNT.toFixed(1)};
    float a = atan(p.y, p.x);
    float sd = sin(a - round(a / stepA) * stepA) * r;   // signed distance to spoke center
    float road = 1.0 - smoothstep(${(SPOKE_HALF_WIDTH - 1).toFixed(1)}, ${(SPOKE_HALF_WIDTH + 1).toFixed(1)}, abs(sd));
    col = mix(col, uRoad, road);
    float dash = step(0.45, fract(r / 9.0));
    emis += uCyan * lineAA(sd, 0.12) * dash * 0.9 * road;
    emis += uCyan * lineAA(abs(sd) - ${(SPOKE_HALF_WIDTH - 1.5).toFixed(1)}, 0.1) * 0.6;
  }

  // project avenue
  if (p.x > ${AVENUE.x0.toFixed(1)} && p.x < ${AVENUE.x1.toFixed(1)}) {
    float road = 1.0 - smoothstep(${(AVENUE.halfWidth - 2).toFixed(1)}, ${AVENUE.halfWidth.toFixed(1)}, abs(p.y));
    col = mix(col, uRoad, road);
    emis += uMagenta * lineAA(abs(p.y) - ${(AVENUE.halfWidth - 3).toFixed(1)}, 0.15) * 0.8;
    emis += uCyan * lineAA(abs(p.y) - 12.0, 0.1) * step(0.5, fract(p.x / 10.0)) * 0.6;
  }

  // plaza disc + rim (the animated hologram comes in M3)
  float plaza = 1.0 - smoothstep(${PLAZA_RADIUS - 2}.0, ${PLAZA_RADIUS}.0, r);
  col = mix(col, uBase * 0.6, plaza);
  emis += uCyan * lineAA(r - ${PLAZA_RADIUS - 6}.0, 0.4) * 1.5;

  gl_FragColor = vec4(min(col + emis, vec3(24.0)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`

export function Ground() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        fog: true,
        uniforms: UniformsUtils.merge([
          UniformsLib.fog,
          {
            uBase: { value: new Color('#05060c') },
            uRoad: { value: new Color('#0c0e1a') },
            uCyan: { value: new Color(palette.cyan).multiplyScalar(1.3) },
            uMagenta: { value: new Color(palette.magenta).multiplyScalar(1.3) },
          },
        ]),
      }),
    [],
  )

  return (
    <mesh rotation-x={-Math.PI / 2} position={[300, 0, 0]} material={material}>
      <planeGeometry args={[5000, 5000]} />
    </mesh>
  )
}
