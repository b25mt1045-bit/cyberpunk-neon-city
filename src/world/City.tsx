import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BoxGeometry,
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  Object3D,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from 'three'
import { palette } from '../theme'
import { buildingFragment, buildingVertex } from '../shaders/buildings'
import { getCity } from './cityLayout'
import { sceneClock } from './sceneTime'

// Edge-glow colors (HDR: values > 1 feed the bloom).
const ACCENTS = [palette.cyan, palette.magenta, palette.purple, palette.teal]
// Window light tones: warm sodium, cool white, cyan, pink.
const WINDOWS = ['#ffb468', '#cfe8ff', '#5ff6ff', '#ff7ad9']

export function City({ density = 1 }: { density?: number }) {
  const ref = useRef<InstancedMesh>(null)
  const buildings = useMemo(() => getCity(density), [density])

  const geometry = useMemo(() => {
    const g = new BoxGeometry(1, 1, 1)
    const n = buildings.length
    const dims = new Float32Array(n * 3)
    const seeds = new Float32Array(n)
    const accents = new Float32Array(n)
    buildings.forEach((b, i) => {
      dims.set([b.w, b.h, b.d], i * 3)
      seeds[i] = b.seed
      accents[i] = b.accent
    })
    g.setAttribute('aDims', new InstancedBufferAttribute(dims, 3))
    g.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 1))
    g.setAttribute('aAccent', new InstancedBufferAttribute(accents, 1))
    return g
  }, [buildings])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: buildingVertex,
        fragmentShader: buildingFragment,
        fog: true,
        uniforms: UniformsUtils.merge([
          UniformsLib.fog,
          {
            uTime: { value: 0 },
            uBase: { value: new Color('#070912') },
            uUplight: { value: new Color(palette.purple) },
            uAccents: { value: ACCENTS.map((c) => new Color(c).multiplyScalar(1.6)) },
            uWindows: { value: WINDOWS.map((c) => new Color(c).multiplyScalar(1.2)) },
          },
        ]),
      }),
    [],
  )

  useLayoutEffect(() => {
    const mesh = ref.current!
    const o = new Object3D()
    buildings.forEach((b, i) => {
      o.position.set(b.x, b.y0 + b.h / 2, b.z)
      o.scale.set(b.w, b.h, b.d)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [buildings])

  useFrame(() => {
    material.uniforms.uTime.value = sceneClock.time
  })

  return <instancedMesh ref={ref} args={[geometry, material, buildings.length]} frustumCulled={false} />
}
