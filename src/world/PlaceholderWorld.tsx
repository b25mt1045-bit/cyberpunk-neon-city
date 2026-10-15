import { useLayoutEffect, useMemo, useRef } from 'react'
import { Grid, Line } from '@react-three/drei'
import { Color, InstancedMesh, Object3D } from 'three'
import { palette } from '../theme'
import { LANDMARKS, flightPathPoints } from '../camera/flightPath'

// M1 stand-in scene: enough reference geometry to judge camera motion.
// Replaced by the procedural city in M2.

const BLOCKS = 900

function BlockField() {
  const ref = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current!
    const o = new Object3D()
    const c = new Color()
    const corridor = flightPathPoints(600)
    let rnd = 1337
    const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647)
    let i = 0
    while (i < BLOCKS) {
      const x = (rand() - 0.5) * 2000 + 300
      const z = (rand() - 0.5) * 1600
      // keep the plaza and the avenue clear
      if (Math.hypot(x, z) < 90 || (x > 200 && x < 720 && Math.abs(z) < 30)) continue
      const h = 20 + rand() ** 2 * 180
      // keep a corridor around the flight path wherever the camera is lower than the roof
      if (corridor.some((p) => p.y < h + 25 && Math.hypot(p.x - x, p.z - z) < 45)) continue
      o.position.set(x, h / 2, z)
      o.scale.set(14 + rand() * 16, h, 14 + rand() * 16)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      mesh.setColorAt(i, c.set(rand() > 0.5 ? palette.purple : '#1a1f3a'))
      i++
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, BLOCKS]}>
      <boxGeometry />
      <meshStandardMaterial color="#ffffff" roughness={0.8} />
    </instancedMesh>
  )
}

function Marker({ at, height, color }: { at: { x: number; z: number }; height: number; color: string }) {
  return (
    <mesh position={[at.x, height / 2, at.z]}>
      <boxGeometry args={[30, height, 30]} />
      <meshBasicMaterial color={color} wireframe />
    </mesh>
  )
}

export function PlaceholderWorld() {
  const path = useMemo(() => flightPathPoints(), [])

  return (
    <>
      <color attach="background" args={[palette.bg]} />
      <fogExp2 attach="fog" args={[palette.bg, 0.0011]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[200, 400, 100]} intensity={1.2} color={palette.cyan} />

      <mesh rotation-x={-Math.PI / 2} position={[300, 0, 0]}>
        <planeGeometry args={[4000, 4000]} />
        <meshStandardMaterial color="#070914" />
      </mesh>
      <Grid
        position={[300, 0.05, 0]}
        args={[4000, 4000]}
        cellSize={20}
        sectionSize={100}
        cellColor="#0b3a4a"
        sectionColor={palette.cyan}
        fadeDistance={1800}
        infiniteGrid={false}
      />

      {/* plaza */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.2, 0]}>
        <ringGeometry args={[50, 60, 96]} />
        <meshBasicMaterial color={palette.cyan} />
      </mesh>

      <BlockField />

      <Marker at={LANDMARKS.aboutTower} height={220} color={palette.magenta} />
      <Marker at={LANDMARKS.skillsTower} height={260} color={palette.teal} />
      <Marker at={LANDMARKS.contactMast} height={260} color={palette.orange} />

      {/* debug: the flight path */}
      <Line points={path} color={palette.red} lineWidth={1} transparent opacity={0.5} />
    </>
  )
}
