// Shared GLSL snippets.

/** Additive glow shaders can't use three's fog mix (it would add fog color);
 *  instead they fade toward black with the same FogExp2 curve. Requires `fog: true`. */
export const glowFogPars = /* glsl */ `
uniform float fogDensity;
float glowFog(float depth) {
  float f = fogDensity * depth;
  return exp(-f * f);
}
`

export const hashGLSL = /* glsl */ `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float hash1(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
`
