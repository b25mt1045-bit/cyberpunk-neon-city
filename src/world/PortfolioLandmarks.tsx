import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  CylinderGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  MathUtils,
  Object3D,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from 'three'
import { content } from '../content'
import { useApp } from '../store'
import { palette } from '../theme'
import { SECTIONS } from '../sections/chapters'
import { glowFogPars } from '../shaders/common'
import { HoloPanel } from './holo/HoloPanel'
import { drawAbout, drawContactLabel, drawHeroName, drawProject, drawSkillsStrip } from './holo/panels'
import {
  ABOUT_PANEL,
  CONTACT_BEACONS,
  HERO_NAME,
  PROJECT_PANELS,
  SKILLS_TOWER,
  SKILL_ITEMS,
  skillLevelY,
} from './landmarks'

const skills = SECTIONS.find((s) => s.id === 'skills')!

// ── HERO ─────────────────────────────────────────────────────
function HeroName() {
  const draw = useMemo(() => drawHeroName(content.name, content.title), [])
  // shrink on portrait screens so the name always fits across the view
  const aspect = useThree((s) => s.size.width / s.size.height)
  const scale = Math.min(1, aspect / 0.85)
  return (
    <group scale={[scale, 1, scale]}>
      <HoloPanel
        draw={draw}
        px={[2048, 662]}
        size={[HERO_NAME.width, HERO_NAME.height]}
        position={[0, HERO_NAME.y, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        boost={2.2}
        seed={1}
      />
    </group>
  )
}

// ── ABOUT ────────────────────────────────────────────────────
function AboutBillboard() {
  const draw = useMemo(() => drawAbout(content.name, content.bio, content.location), [])
  const { center, rotY, width, height } = ABOUT_PANEL
  return (
    <HoloPanel
      draw={draw}
      px={[1024, Math.round((1024 * height) / width)]}
      size={[width, height]}
      position={center.toArray()}
      rotation={[0, rotY, 0]}
      boost={1.5}
      seed={2}
      backing
    />
  )
}

// ── PROJECTS ─────────────────────────────────────────────────
function ProjectBillboard({ index }: { index: number }) {
  const [hovered, setHovered] = useState(false)
  const draw = useMemo(() => drawProject(content.projects[index], index), [index])
  const { center, rotY, width, height } = PROJECT_PANELS[index]
  const open = useApp((s) => s.openProject)
  return (
    <HoloPanel
      draw={draw}
      px={[1024, Math.round((1024 * height) / width)]}
      size={[width, height]}
      position={center.toArray()}
      rotation={[0, rotY, 0]}
      boost={1.5}
      seed={10 + index}
      backing
      hovered={hovered}
      onHover={setHovered}
      onClick={(e) => {
        e.stopPropagation()
        open(index)
      }}
    />
  )
}

// ── SKILLS ───────────────────────────────────────────────────
const plateVertex = /* glsl */ `
attribute float aLevel;
uniform float uReveal;
varying float vLit;
varying float vFogDepth;
void main() {
  vLit = mix(0.08, 1.0, 1.0 - smoothstep(uReveal - 0.04, uReveal, aLevel));
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vFogDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`
const plateFragment = /* glsl */ `
uniform vec3 uColor;
varying float vLit;
varying float vFogDepth;
${glowFogPars}
void main() {
  gl_FragColor = vec4(min(uColor * vLit * glowFog(vFogDepth), vec3(24.0)), 1.0);
}
`

/** 0..1 reveal driven by progress through the skills chapter (tops out at the last floor). */
function skillsReveal() {
  const local = (useApp.getState().progress - skills.start) / (skills.end - skills.start)
  return MathUtils.clamp(local * 1.25, 0, 1.05)
}

function SkillsTower() {
  const { center, half, yMin, yMax } = SKILLS_TOWER
  const n = SKILL_ITEMS.length
  // the label strip spans the floors plus a margin
  const stripBottom = yMin - 6
  const stripTop = yMax + 10
  const stripH = stripTop - stripBottom
  const levelFrac = (i: number) => (skillLevelY(i) - stripBottom) / stripH
  const draw = useMemo(() => drawSkillsStrip(SKILL_ITEMS, levelFrac), [])
  const stripW = half * 2 - 6

  // glowing floor plates, one per skill, slightly wider than the tower
  const plates = useRef<InstancedMesh>(null)
  const { geometry, material } = useMemo(() => {
    const g = new BoxGeometry(1, 1, 1)
    g.setAttribute(
      'aLevel',
      new InstancedBufferAttribute(Float32Array.from(SKILL_ITEMS, (_, i) => (n === 1 ? 0 : i / (n - 1))), 1),
    )
    const m = new ShaderMaterial({
      vertexShader: plateVertex,
      fragmentShader: plateFragment,
      fog: true,
      uniforms: UniformsUtils.merge([
        UniformsLib.fog,
        { uReveal: { value: 0 }, uColor: { value: new Color(palette.cyan).multiplyScalar(2.2) } },
      ]),
    })
    return { geometry: g, material: m }
  }, [n])

  useLayoutEffect(() => {
    const o = new Object3D()
    SKILL_ITEMS.forEach((_, i) => {
      o.position.set(center.x, skillLevelY(i) - 2.5, center.z)
      o.scale.set(half * 2 + 1.6, 0.5, half * 2 + 1.6)
      o.updateMatrix()
      plates.current!.setMatrixAt(i, o.matrix)
    })
    plates.current!.instanceMatrix.needsUpdate = true
  }, [center, half])

  const reveal = (m: ShaderMaterial) => {
    // map floor reveal (0..1 across floors) into the strip's UV space
    const r = skillsReveal()
    const y = yMin + r * (yMax - yMin)
    m.uniforms.uReveal.value = (y + 4 - stripBottom) / stripH
  }
  useFrame(() => (material.uniforms.uReveal.value = skillsReveal()))

  const midY = (stripBottom + stripTop) / 2
  const px: [number, number] = [512, Math.round((512 * stripH) / stripW)]
  return (
    <>
      <instancedMesh ref={plates} args={[geometry, material, n]} frustumCulled={false} />
      {/* −Z face (seen while climbing) and +X face (seen at the top of the climb) */}
      <HoloPanel draw={draw} px={px} size={[stripW, stripH]} position={[center.x, midY, center.z - half - 1]} rotation={[0, Math.PI, 0]} boost={1.4} seed={30} onFrame={reveal} />
      <HoloPanel draw={draw} px={px} size={[stripW, stripH]} position={[center.x + half + 1, midY, center.z]} rotation={[0, Math.PI / 2, 0]} boost={1.4} seed={31} onFrame={reveal} />
    </>
  )
}

// ── CONTACT ──────────────────────────────────────────────────
const beamVertex = /* glsl */ `
varying float vY;
varying float vFogDepth;
void main() {
  vY = uv.y;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vFogDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`
const beamFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
uniform float uHover;
varying float vY;
varying float vFogDepth;
${glowFogPars}
void main() {
  float fade = pow(1.0 - vY, 1.6);
  float pulse = 0.7 + 0.3 * sin(uTime * 3.0 - vY * 12.0);
  vec3 col = uColor * fade * pulse * (1.4 + uHover * 1.5) * glowFog(vFogDepth);
  gl_FragColor = vec4(min(col, vec3(24.0)), 1.0);
}
`

function ContactBeacon({ index }: { index: number }) {
  const { link, base } = CONTACT_BEACONS[index]
  const [hovered, setHovered] = useState(false)
  const draw = useMemo(() => drawContactLabel(link), [link])
  const beam = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: beamVertex,
        fragmentShader: beamFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        fog: true,
        uniforms: UniformsUtils.merge([
          UniformsLib.fog,
          { uColor: { value: new Color(palette.teal) }, uTime: { value: 0 }, uHover: { value: 0 } },
        ]),
      }),
    [],
  )
  const beamGeo = useMemo(() => new CylinderGeometry(0.9, 0.9, 80, 12, 1, true).translate(0, 40, 0), [])
  useFrame((s, delta) => {
    beam.uniforms.uTime.value = s.clock.elapsedTime + index
    beam.uniforms.uHover.value = MathUtils.damp(beam.uniforms.uHover.value, hovered ? 1 : 0, 8, delta)
  })
  useEffect(() => () => useApp.getState().setPointerHint(false), [])

  const go = () => {
    if (link.href.startsWith('mailto:')) window.location.href = link.href
    else window.open(link.href, '_blank', 'noopener,noreferrer')
  }

  return (
    <group position={base.toArray()}>
      <mesh geometry={beamGeo} material={beam} renderOrder={3} />
      <Billboard position={[0, 20, 0]}>
        <HoloPanel
          draw={draw}
          px={[512, 256]}
          size={[14, 7]}
          position={[0, 0, 0]}
          boost={1.7}
          seed={40 + index}
          hovered={hovered}
          onHover={setHovered}
          onClick={(e) => {
            e.stopPropagation()
            go()
          }}
        />
      </Billboard>
    </group>
  )
}

export function Landmarks() {
  return (
    <>
      <HeroName />
      <AboutBillboard />
      {PROJECT_PANELS.map((_, i) => (
        <ProjectBillboard key={i} index={i} />
      ))}
      <SkillsTower />
      {CONTACT_BEACONS.map((_, i) => (
        <ContactBeacon key={i} index={i} />
      ))}
    </>
  )
}
