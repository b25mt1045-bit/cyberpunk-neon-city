import { AdditiveBlending, DoubleSide, ShaderMaterial, Texture, UniformsLib, UniformsUtils } from 'three'
import { glowFogPars, hashGLSL } from './common'

// Hologram panel: canvas texture + scanlines, flicker, occasional horizontal glitch bands,
// a reveal mask that sweeps upward (used by the skills tower), a travelling scan line
// and a hover boost.

const vertex = /* glsl */ `
varying vec2 vUv;
varying float vFogDepth;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vFogDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`

const fragment = /* glsl */ `
uniform sampler2D uMap;
uniform float uTime;
uniform float uBoost;
uniform float uOpacity;
uniform float uHover;
uniform float uReveal;
uniform float uSeed;
uniform float uSweep;
uniform float uFogScale;
varying vec2 vUv;
varying float vFogDepth;
${glowFogPars}
${hashGLSL}

void main() {
  vec2 uv = vUv;

  // glitch: a few horizontal bands jump sideways for a frame now and then
  float band = floor(uv.y * 28.0);
  float tick = floor(uTime * 14.0);
  float g = step(0.992, hash(vec2(band + uSeed, tick)));
  uv.x += g * (hash(vec2(tick, band)) - 0.5) * 0.06;

  vec4 tex = texture2D(uMap, uv);
  vec3 col = tex.rgb * tex.a;

  float scan = 0.82 + 0.18 * sin(gl_FragCoord.y * 1.6 + uTime * 6.0);
  float flicker = 0.93 + 0.07 * sin(uTime * 23.0 + uSeed * 10.0) * sin(uTime * 7.0);

  // reveal: everything below uReveal is fully lit; above it is a dim ghost
  float lit = mix(0.12, 1.0, 1.0 - smoothstep(uReveal - 0.015, uReveal + 0.015, vUv.y));

  // sweep: a bright scan line travelling up the panel (off when uSweep is far outside 0..1)
  float sw = (vUv.y - uSweep) * 30.0;
  float sweep = 1.0 + 2.5 * exp(-min(sw * sw, 60.0));

  col *= scan * flicker * lit * sweep * uBoost * (1.0 + uHover * 0.6) * uOpacity;
  col *= glowFog(vFogDepth * uFogScale);
  gl_FragColor = vec4(min(col, vec3(24.0)), 1.0);
}
`

export function createHoloMaterial(map: Texture, opts: { boost?: number; seed?: number; fogScale?: number } = {}) {
  const material = new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    fog: true,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uTime: { value: 0 },
        uBoost: { value: opts.boost ?? 1.6 },
        uOpacity: { value: 1 },
        uHover: { value: 0 },
        uReveal: { value: 2 },
        uSeed: { value: opts.seed ?? 0 },
        uSweep: { value: -10 },
        // < 1 lets very large holograms punch through the haze
        uFogScale: { value: opts.fogScale ?? 1 },
      },
    ]),
  })
  // added after merge: UniformsUtils.merge would clone the texture
  material.uniforms.uMap = { value: map }
  return material
}
