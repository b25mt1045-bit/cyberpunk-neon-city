// Procedural building shader: dark facades, emissive window grid (random lit/unlit,
// a few flickering), neon bands, glowing edges, street-level uplight. Fog-aware.

export const buildingVertex = /* glsl */ `
attribute vec3 aDims;
attribute float aSeed;
attribute float aAccent;

varying vec3 vLocal;
varying vec3 vNormalL;
varying vec3 vDims;
varying float vSeed;
varying float vAccent;
varying float vWorldY;

#include <fog_pars_vertex>

void main() {
  vLocal = position;
  vNormalL = normal;
  vDims = aDims;
  vSeed = aSeed;
  vAccent = aAccent;

  vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorldY = worldPos.y;
  vec4 mvPosition = viewMatrix * worldPos;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`

export const buildingFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uBase;
uniform vec3 uUplight;
uniform vec3 uAccents[4];
uniform vec3 uWindows[4];

varying vec3 vLocal;
varying vec3 vNormalL;
varying vec3 vDims;
varying float vSeed;
varying float vAccent;
varying float vWorldY;

#include <fog_pars_fragment>

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec3 n = normalize(vNormalL);
  vec3 p = vLocal * vDims;              // meters, box-centered
  float h = vDims.y;
  bool isTop = n.y > 0.5;

  // facade coordinates: f.x across the face (centered), f.y up from the tier base
  vec2 f;
  float halfW;
  if (abs(n.x) > 0.5) { f = vec2(p.z, p.y + h * 0.5); halfW = vDims.z * 0.5; }
  else                { f = vec2(p.x, p.y + h * 0.5); halfW = vDims.x * 0.5; }

  vec3 col = uBase;
  // haze-lit lower floors, as if lit by the street
  col += uUplight * exp(-max(vWorldY, 0.0) / 40.0) * 0.35;

  vec3 accent = uAccents[int(clamp(vAccent, 0.0, 3.0))];
  float hasAccent = step(0.0, vAccent);
  vec3 emis = vec3(0.0);

  // thin elements (masts, spires) get no window grid
  bool slender = min(vDims.x, vDims.z) < 8.0;

  if (!isTop && !slender) {
    // ── windows ──
    float scale = 0.85 + 0.45 * hash(vec2(vSeed, 1.0));
    vec2 cellSize = vec2(3.0, 3.6) * scale;
    vec2 g = f / cellSize;
    vec2 cell = floor(g);
    vec2 q = fract(g);
    float win = step(0.2, q.x) * step(q.x, 0.8) * step(0.28, q.y) * step(q.y, 0.82);

    float faceId = n.x * 3.0 + n.z * 7.0;
    float r = hash(cell + vSeed * 91.0 + faceId);
    // about a third of the buildings are nearly dark, for deep blacks
    float occupancy = hash(vec2(vSeed, 2.0));
    float litProb = occupancy < 0.33 ? 0.04 + 0.1 * occupancy : 0.15 + 0.4 * occupancy;
    float lit = step(1.0 - litProb, r);

    // ~3% of windows flicker
    float flickers = step(0.97, hash(cell * 1.3 + vSeed * 7.0));
    float on = step(0.35, hash(vec2(floor(uTime * 9.0), r * 100.0)));
    lit *= mix(1.0, on, flickers);

    vec3 tone = uWindows[int(hash(vec2(vSeed, 3.0)) * 3.99)];
    vec3 alt = uWindows[int(r * 3.99)];
    vec3 wc = mix(tone, alt, 0.25) * (0.35 + 0.85 * hash(cell * 1.7 + vSeed));
    vec3 windows = wc * lit * win;

    // fade to the average when windows get smaller than a couple of pixels (kills moiré)
    vec2 fw = fwidth(g);
    float far = smoothstep(0.25, 0.8, max(fw.x, fw.y));
    vec3 avg = mix(tone, alt, 0.25) * litProb * 0.3 * 0.78;
    emis += mix(windows, avg, far);

    // ── neon band near the crown on some buildings ──
    if (hash(vec2(vSeed, 4.0)) > 0.68) {
      float bandY = h - 4.0 - floor(hash(vec2(vSeed, 5.0)) * 3.0) * 6.0;
      float band = 1.0 - smoothstep(0.0, 0.9, abs(f.y - bandY));
      emis += mix(uAccents[int(hash(vec2(vSeed, 6.0)) * 3.99)], accent, hasAccent) * band * 2.2;
    }
  }

  // ── glowing edges ──
  float d;
  if (isTop) d = min(vDims.x * 0.5 - abs(p.x), vDims.z * 0.5 - abs(p.z));
  else       d = min(halfW - abs(f.x), h - f.y);
  // MSAA can evaluate slightly outside the face, so d may be extrapolated negative
  d = max(d, 0.0);
  float aa = fwidth(d) * 1.5;
  float line = 1.0 - smoothstep(0.0, aa + 0.12, d);
  float halo = exp(-d / 1.2) * 0.35 * (slender ? 0.25 : 1.0);
  float rise = isTop ? 1.0 : 0.25 + 0.75 * smoothstep(0.0, h, f.y);
  emis += accent * hasAccent * (line * 3.0 + halo) * rise;

  // keep HDR finite: anything above half-float range turns into NaN inside the bloom chain
  gl_FragColor = vec4(min(col + emis, vec3(24.0)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`
