import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, FogExp2, MathUtils, Mesh, ShaderMaterial } from 'three'
import { palette } from '../theme'
import { useApp } from '../store'
import { SETTINGS } from '../quality'
import { aboveClouds } from './landmarks'
import { deckWhiteout } from './Orbit'
import { sceneClock } from './sceneTime'

// Exponential fog whose density follows camera altitude (thick haze in the streets,
// clearer from above), plus a few drifting additive haze layers between the towers.

const BG = new Color(palette.bg)
const CLOUD = new Color(palette.purple).lerp(new Color('#ccbfff'), 0.55).multiplyScalar(0.6)

const HAZE_LAYERS = [
  { y: 18, color: palette.purple, opacity: 0.12 },
  { y: 55, color: palette.magenta, opacity: 0.06 },
  { y: 110, color: palette.cyan, opacity: 0.04 },
]

const hazeVertex = /* glsl */ `
varying vec2 vXZ;
varying float vDist;
void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vXZ = worldPos.xz;
  vec4 mv = viewMatrix * worldPos;
  vDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`

const hazeFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;
varying vec2 vXZ;
varying float vDist;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main() {
  vec2 p = vXZ / 260.0 + vec2(uTime * 0.008, uTime * 0.005);
  float n = smoothstep(0.35, 0.85, fbm(p));
  // fade out near the camera so you can fly through a layer without a hard edge
  float near = smoothstep(20.0, 160.0, vDist);
  float far = 1.0 - smoothstep(1400.0, 2600.0, vDist);
  gl_FragColor = vec4(uColor * n * uOpacity * near * far, 1.0);
}
`

function HazeLayer({ y, color, opacity }: (typeof HAZE_LAYERS)[number]) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: hazeVertex,
        fragmentShader: hazeFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uColor: { value: new Color(color) },
          uOpacity: { value: opacity },
          uTime: { value: 0 },
        },
      }),
    [color, opacity],
  )
  const ref = useRef<Mesh>(null)
  useFrame((s) => {
    material.uniforms.uTime.value = sceneClock.time + y
    // An edge-on plane through the camera can rasterize NaNs, which bloom smears over
    // the whole frame. Hide the layer while the camera is passing through it.
    ref.current!.visible = Math.abs(s.camera.position.y - y) > 4 && !aboveClouds(s.camera.position.y)
  })

  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} position={[300, y, 0]} material={material} renderOrder={1}>
      <planeGeometry args={[4000, 4000]} />
    </mesh>
  )
}

export function Atmosphere() {
  const { haze } = SETTINGS[useApp((s) => s.tier)]
  const fog = useMemo(() => new FogExp2(new Color(palette.bg).getHex(), 0.0014), [])
  const background = useMemo(() => new Color(palette.bg), [])

  useFrame(({ camera }) => {
    // 0.0026 at street level → 0.0008 from 600 m up
    const t = MathUtils.smoothstep(camera.position.y, 30, 500)
    fog.density = MathUtils.lerp(0.0026, 0.0008, t)
    // inside the cloud deck everything dissolves into lit cloud
    const white = deckWhiteout(camera.position.y)
    fog.density += white * 0.02
    fog.color.copy(BG).lerp(CLOUD, white)
    background.copy(fog.color)
  })

  return (
    <>
      <primitive object={fog} attach="fog" />
      <primitive object={background} attach="background" />
      {HAZE_LAYERS.slice(0, haze).map((l) => (
        <HazeLayer key={l.y} {...l} />
      ))}
    </>
  )
}
