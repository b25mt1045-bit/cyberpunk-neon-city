import { Canvas } from '@react-three/fiber'
import { CameraRig } from './camera/CameraRig'
import { PlaceholderWorld } from './world/PlaceholderWorld'
import { Sections } from './sections/Sections'
import { DebugReadout } from './ui/DebugReadout'
import { useSmoothScroll } from './scroll/useSmoothScroll'

export default function App() {
  useSmoothScroll()

  return (
    <>
      <div className="fixed inset-0 z-0" aria-hidden>
        <Canvas
          dpr={[1, 1.5]}
          camera={{ fov: 55, near: 1, far: 6000, position: [0, 620, 2] }}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
        >
          <PlaceholderWorld />
          <CameraRig />
        </Canvas>
      </div>
      <Sections />
      {import.meta.env.DEV && <DebugReadout />}
    </>
  )
}
