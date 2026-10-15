import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BackSide, Color, Mesh, ShaderMaterial, Vector2, Vector3 } from 'three'
import { palette } from '../theme'
import { hashGLSL } from '../shaders/common'
import { ORBIT } from './landmarks'

// Orbit epilogue sky. One camera-centered dome whose shader ray-traces a spherical cloud
// deck (a small stylized planet):
// - below the deck: a faint overcast ceiling lit from beneath by the city;
// - crossing it: a whiteout (also pushed into the scene fog by Atmosphere);
// - above it: a curved cloud sea with city light leaking through the gaps, a thin glowing
//   atmosphere limb, dawn on the horizon ahead, and stars.
// Everything is in kilometers inside the shader to keep float precision at planet scale.

const DOME_RADIUS = 5500

const vertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragment = /* glsl */ `
uniform vec3 uCam;     // km, relative to the planet center
uniform float uR;      // km
uniform vec3 uSun;
uniform vec2 uCity;    // km, city center relative to the planet center (xz)
uniform float uTime;
uniform float uWhite;  // 0..1 whiteout while crossing the deck
uniform vec3 uCyan;
uniform vec3 uMagenta;
uniform vec3 uOrange;
uniform vec3 uPurple;
varying vec3 vDir;
${hashGLSL}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.07 + 13.1; a *= 0.5; }
  return v;
}
float clouds(vec2 p) {
  vec2 w = vec2(fbm(p * 0.6 + uTime * 0.01), fbm(p * 0.6 - 4.3));
  return fbm(p + w * 1.4 + vec2(uTime * 0.02, 0.0));
}

void main() {
  vec3 d = normalize(vDir);
  float r0 = length(uCam);
  bool above = r0 > uR;
  float b = dot(uCam, d);
  float c = r0 * r0 - uR * uR;
  float disc = b * b - c;

  vec3 col = vec3(0.0);
  float alpha = 0.0;
  vec3 cloudTint = mix(uPurple, vec3(0.8, 0.75, 1.0), 0.55);

  if (above) {
    // x: angle (radians) above the horizon; negative below it
    float e = asin(clamp(b / r0, -1.0, 1.0));
    float x = e + acos(clamp(uR / r0, 0.0, 1.0));
    // dawn hugs the horizon in the sun's direction
    float az = max(dot(normalize(d.xz), normalize(uSun.xz)), 0.0);
    float dawn = pow(az, 10.0);
    vec3 limbCol = mix(uCyan, mix(uMagenta, uOrange, dawn), clamp(dawn * 1.3, 0.0, 1.0));

    if (disc > 0.0 && b < 0.0) {
      // cloud sea
      float t = -b - sqrt(disc);
      vec3 P = uCam + d * t;
      float n = clouds(P.xz * 1.3);
      float dens = smoothstep(0.3, 0.75, n);
      vec3 top = mix(vec3(0.015, 0.02, 0.05), cloudTint * 0.32, dens);
      // dawn light catching the cloud tops
      top += uOrange * dens * dawn * 0.25;
      // the city glowing up through the gaps
      float cityD = length(P.xz - uCity);
      float city = exp(-cityD * cityD * 1.6);
      top += mix(uMagenta, uCyan, n) * city * (1.0 - dens * 0.8) * 1.4;
      top += uMagenta * exp(-cityD * 0.9) * 0.06;
      // haze toward the limb, then a thin bright rim right at the edge
      float haze = 1.0 - exp(-t * 0.12);
      col = mix(top, limbCol * (0.12 + dawn * 0.25), haze * 0.8);
      col += limbCol * exp(x / 0.012) * (0.5 + dawn);
    } else {
      // space: stars, a faint violet band, the atmosphere limb
      vec3 s = d * 260.0;
      vec3 cell = floor(s);
      float h = hash(cell.xy + cell.z * 17.31);
      float star = step(0.985, h) * smoothstep(0.42, 0.0, length(fract(s) - 0.5));
      star *= 0.6 + 0.4 * sin(uTime * (1.0 + h * 4.0) + h * 40.0);
      star *= smoothstep(0.02, 0.25, x); // washed out by the glow near the limb
      col = vec3(star) * mix(vec3(0.7, 0.85, 1.0), vec3(1.0, 0.8, 0.9), hash(cell.yz)) * 3.0;
      col += uPurple * 0.05 * smoothstep(0.55, 0.9, fbm(d.xz * 3.0 + d.y * 2.0));
      col += vec3(0.01, 0.012, 0.03);
      // atmosphere: a thin bright shell plus a wider soft glow, stronger toward dawn
      col += limbCol * (exp(-x / 0.015) * (1.0 + dawn * 2.0) + exp(-x / 0.14) * (0.12 + dawn * 0.35));
    }
    alpha = 1.0;
  } else if (d.y > 0.0) {
    // overcast ceiling seen from below, lit by the city
    float t = -b + sqrt(max(disc, 0.0));
    vec3 P = uCam + d * t;
    float n = clouds(P.xz * 1.3);
    float dens = smoothstep(0.35, 0.8, n);
    float fade = exp(-t * 0.35);
    col = mix(uPurple, uMagenta, n) * 0.35 * dens;
    alpha = dens * fade * 0.85;
  }

  vec3 white = cloudTint * 0.6;
  col = mix(col, white, uWhite);
  alpha = max(alpha, uWhite);
  gl_FragColor = vec4(min(col, vec3(24.0)), alpha);
}
`

const km = (v: Vector3, out: Vector3) => out.copy(v).sub(ORBIT.center).multiplyScalar(0.001)

/** 0..1 while the camera is inside the cloud deck. */
export const deckWhiteout = (y: number) => Math.max(0, 1 - Math.abs(y - ORBIT.deckY) / 60)

export function Orbit() {
  const mesh = useRef<Mesh>(null)
  const material = useMemo(() => {
    const sun = new Vector3(0.49, -0.08, -0.87).normalize()
    const city = new Vector3(300, 0, 0).sub(ORBIT.center).multiplyScalar(0.001)
    return new ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      side: BackSide,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uCam: { value: new Vector3() },
        uR: { value: ORBIT.radius * 0.001 },
        uSun: { value: sun },
        uCity: { value: new Vector2(city.x, city.z) },
        uTime: { value: 0 },
        uWhite: { value: 0 },
        uCyan: { value: new Color(palette.cyan) },
        uMagenta: { value: new Color(palette.magenta) },
        uOrange: { value: new Color(palette.orange) },
        uPurple: { value: new Color(palette.purple) },
      },
    })
  }, [])

  useFrame(({ camera, clock }) => {
    const m = mesh.current!
    // nothing to show until the camera is high enough to look up at the deck
    m.visible = camera.position.y > 150
    m.position.copy(camera.position)
    km(camera.position, material.uniforms.uCam.value)
    material.uniforms.uTime.value = clock.elapsedTime
    material.uniforms.uWhite.value = deckWhiteout(camera.position.y)
  })

  return (
    <mesh ref={mesh} material={material} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[DOME_RADIUS, 48, 24]} />
    </mesh>
  )
}
