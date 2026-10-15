import { useEffect, useMemo } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { CanvasTexture, DoubleSide, MathUtils, SRGBColorSpace, type ShaderMaterial } from 'three'
import { useApp } from '../../store'
import { createHoloMaterial } from '../../shaders/holo'
import { fontsReady, type Draw } from './panels'

/** CanvasTexture drawn by `draw`, redrawn once web fonts finish loading. */
export function useCanvasTexture(width: number, height: number, draw: Draw) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const t = new CanvasTexture(canvas)
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 4
    return t
  }, [width, height])

  useEffect(() => {
    let alive = true
    const paint = () => {
      const canvas = texture.image as HTMLCanvasElement
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, width, height)
      draw(ctx, width, height)
      texture.needsUpdate = true
    }
    paint()
    fontsReady.then(() => alive && paint())
    return () => {
      alive = false
    }
  }, [texture, draw, width, height])

  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

interface HoloPanelProps {
  draw: Draw
  /** canvas resolution */
  px: [number, number]
  /** world size in meters */
  size: [number, number]
  position: [number, number, number]
  rotation?: [number, number, number]
  boost?: number
  seed?: number
  /** called every frame with the material, e.g. to drive uReveal */
  onFrame?: (m: ShaderMaterial) => void
  hovered?: boolean
  onClick?: (e: ThreeEvent<MouseEvent>) => void
  onHover?: (over: boolean) => void
  /** opaque dark plate behind the hologram so whatever is behind doesn't show through */
  backing?: boolean
}

export function HoloPanel({ draw, px, size, position, rotation, boost, seed, onFrame, hovered, onClick, onHover, backing }: HoloPanelProps) {
  const texture = useCanvasTexture(px[0], px[1], draw)
  const material = useMemo(() => createHoloMaterial(texture, { boost, seed }), [texture, boost, seed])

  useFrame((s, delta) => {
    const u = material.uniforms
    u.uTime.value = s.clock.elapsedTime
    u.uHover.value = MathUtils.damp(u.uHover.value, hovered ? 1 : 0, 8, delta)
    onFrame?.(material)
  })

  const interactive = !!onClick
  return (
    <mesh
      position={position}
      rotation={rotation}
      material={material}
      renderOrder={5}
      onClick={onClick}
      onPointerOver={
        interactive
          ? (e) => {
              e.stopPropagation()
              useApp.getState().setPointerHint(true)
              onHover?.(true)
            }
          : undefined
      }
      onPointerOut={
        interactive
          ? () => {
              useApp.getState().setPointerHint(false)
              onHover?.(false)
            }
          : undefined
      }
    >
      <planeGeometry args={size} />
      {backing && (
        <mesh position={[0, 0, -0.3]}>
          <planeGeometry args={[size[0] * 1.02, size[1] * 1.02]} />
          <meshBasicMaterial color="#04050b" side={DoubleSide} />
        </mesh>
      )}
    </mesh>
  )
}
